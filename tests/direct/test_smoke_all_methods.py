"""Full-method smoke test for private_p2p_contract.py on the direct GenVM.

Exercises EVERY public method (3 view + 15 write) across two complete flows
(private close & full dispute) to surface any runtime error a naive deploy
test could miss. Run with the same command as the other direct tests.
"""

import datetime
import json

from tests.direct.conftest import commit_hash, clause_hash, split_clauses, to_hex, mark_evidence_both

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"
HASH = commit_hash(TERMS, SALT)


def _deploy(direct_deploy, a, b):
    return direct_deploy("contracts/private_p2p_contract.py", a, b)


def _commit_both(direct_vm, c, a, b, terms=TERMS, salt=SALT):
    h = commit_hash(terms, salt)
    direct_vm.sender = a
    c.commit_terms(h)
    direct_vm.sender = b
    c.commit_terms(h)


def _mock_ruling(vm, who_won="A"):
    vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps({"who_won": who_won, "verdict": "Party A wins.", "reasoning": "Supported by terms."}),
    )


# ---------------------------------------------------------------- views


def test_view_methods(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy, direct_alice, direct_bob)

    s = c.get_state()
    assert s["status"] == "CREATED"

    direct_vm.sender = direct_alice
    assert c.is_private() is True
    assert c.am_i_party() is True

    direct_vm.sender = direct_bob
    assert c.am_i_party() is True


# ------------------------------------------------------- private close


def test_private_close_flow(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)
    assert c.get_state()["status"] == "ACTIVE"

    direct_vm.sender = direct_alice
    c.request_completion()
    direct_vm.sender = direct_alice
    c.retract_completion()
    assert c.get_state()["complete_a"] == "0"

    direct_vm.sender = direct_alice
    c.request_completion()
    direct_vm.sender = direct_bob
    c.request_completion()
    assert c.get_state()["status"] == "RESOLVED"
    assert c.is_private() is False


# ------------------------------------------------------ commit variants


def test_commit_mismatch_retract_reset(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    c.commit_terms(HASH)
    direct_vm.sender = direct_bob
    c.commit_terms("b" * 64)
    assert c.get_state()["status"] == "MISMATCHED"

    # Consent reset (two-party) -> back to CREATED
    direct_vm.sender = direct_alice
    c.reset_commits()
    direct_vm.sender = direct_bob
    c.reset_commits()
    assert c.get_state()["status"] == "CREATED"

    # Mismatch again, then unilateral retract
    direct_vm.sender = direct_alice
    c.commit_terms(HASH)
    direct_vm.sender = direct_bob
    c.commit_terms("c" * 64)
    direct_vm.sender = direct_bob
    c.retract_commit()
    assert c.get_state()["status"] == "PARTIAL"


# ------------------------------------------------------------- dispute


def test_full_dispute_flow_all_methods(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    # clause commitments + partial reveal while ACTIVE
    clauses = split_clauses(TERMS)
    hashes = [clause_hash(cl, SALT, i) for i, cl in enumerate(clauses)]
    direct_vm.sender = direct_alice
    c.commit_clauses(hashes)
    direct_vm.sender = direct_bob
    c.commit_clauses(hashes)
    assert c.get_state()["clause_commits"] == hashes
    direct_vm.sender = direct_alice
    c.reveal_clause(0, clauses[0], SALT)
    assert str(0) in c.get_state()["revealed_clauses"]

    # request dispute, then withdraw
    direct_vm.sender = direct_alice
    c.request_dispute()
    assert c.get_state()["dispute_requested"] == "1"
    direct_vm.sender = direct_alice
    c.withdraw_dispute_request()
    assert c.get_state()["dispute_requested"] == "0"

    # request again and open
    direct_vm.sender = direct_bob
    c.request_dispute()
    direct_vm.sender = direct_bob
    c.open_dispute(TERMS, SALT)
    assert c.get_state()["status"] == "DISPUTED"
    assert c.is_private() is False

    # statements + clarification
    direct_vm.sender = direct_alice
    c.submit_statement("I delivered on time and Bob did not pay.")
    direct_vm.sender = direct_bob
    c.submit_statement("The widgets were defective.")
    direct_vm.sender = direct_alice
    c.request_clarification()
    assert c.get_state()["clarification_requested_by"] == to_hex(direct_alice)

    # both parties complete their evidence input (none) -> resolve opens
    mark_evidence_both(direct_vm, c, direct_alice, direct_bob)
    assert c.get_state()["evidence_reviewed_a"] == "1"
    assert c.get_state()["evidence_reviewed_b"] == "1"

    # resolve via AI jury
    _mock_ruling(direct_vm, "A")
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    s = c.get_state()
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "A"
    assert s["resolve_attempts"] == "1"


# ------------------------------------------- force_resolve (default) & lock


def test_force_resolve_default_judgment_and_expiry(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.request_dispute()
    direct_vm.sender = direct_alice
    c.open_dispute(TERMS, SALT)
    direct_vm.sender = direct_alice
    c.submit_statement("Only Alice responded.")

    # Deadline not yet passed -> force blocked
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("The resolution deadline has not passed yet"):
        c.force_resolve_dispute()

    # warp past the 30-day window
    direct_vm.warp(
        (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=31)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    )
    direct_vm.sender = direct_bob
    c.force_resolve_dispute()
    s = c.get_state()
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "A"
    assert "Default judgment" in s["verdict"]


# ----------------------------------------- force_completion response window


def test_force_completion_after_response_window(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.request_completion()

    direct_vm.warp(
        (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=8)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    )
    direct_vm.sender = direct_alice
    c.force_completion()
    assert c.get_state()["status"] == "RESOLVED"