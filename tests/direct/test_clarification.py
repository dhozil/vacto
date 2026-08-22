"""Tests for the request_clarification() nudge mechanism.

Run with: pytest tests/direct/test_clarification.py -v
"""

from tests.direct.conftest import commit_hash, to_hex, mark_evidence_both

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"


def _deploy(direct_deploy, party_a, party_b):
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def _open_dispute(direct_vm, contract, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_alice
    contract.open_dispute(TERMS, SALT)
    mark_evidence_both(direct_vm, contract, direct_alice, direct_bob)


def test_request_clarification_basic(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.request_clarification()

    state = contract.get_state()
    assert state["clarification_requested_by"] == to_hex(direct_alice)
    assert state["clarification_requested_at"] != ""


def test_request_clarification_only_parties(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can request clarification"):
        contract.request_clarification()


def test_request_clarification_requires_dispute(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))

    with direct_vm.expect_revert("No active dispute to request clarification for"):
        contract.request_clarification()


def test_request_clarification_overwrites(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.request_clarification()
    first_at = contract.get_state()["clarification_requested_at"]

    direct_vm.sender = direct_bob
    contract.request_clarification()
    second_at = contract.get_state()["clarification_requested_at"]

    assert second_at >= first_at
    assert contract.get_state()["clarification_requested_by"] == to_hex(direct_bob)


def test_request_clarification_counterparty_can_revise(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.submit_statement("Original statement")
    assert contract.get_state()["statement_a"] == "Original statement"

    direct_vm.sender = direct_bob
    contract.request_clarification()

    direct_vm.sender = direct_alice
    contract.submit_statement("Revised statement after clarification")
    state = contract.get_state()
    assert state["statement_a"] == "Revised statement after clarification"
    assert state["statement_a_version"] == "2"


def test_clarification_after_resolution_does_not_affect(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Clarification after resolution should not change the resolved state."""
    import json

    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.submit_statement("Alice statement")
    direct_vm.sender = direct_bob
    contract.submit_statement("Bob statement")

    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {"who_won": "A", "verdict": "Alice wins.", "reasoning": "Terms support Alice."}
        ),
    )
    contract.resolve_dispute()
    assert contract.get_state()["status"] == "RESOLVED"

    with direct_vm.expect_revert("No active dispute to request clarification for"):
        contract.request_clarification()


def test_multiple_clarifications_from_both_parties(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Both parties can request clarification; last one wins."""
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.request_clarification()
    assert contract.get_state()["clarification_requested_by"] == to_hex(direct_alice)

    direct_vm.sender = direct_bob
    contract.request_clarification()
    assert contract.get_state()["clarification_requested_by"] == to_hex(direct_bob)


def test_clarification_with_force_resolve(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Clarification can be requested even when force_resolve is available."""
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.submit_statement("Alice statement")

    # Warp past resolve deadline
    import datetime
    direct_vm.warp(
        (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=31)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    )

    # Clarification still works
    direct_vm.sender = direct_bob
    contract.request_clarification()
    assert contract.get_state()["clarification_requested_by"] == to_hex(direct_bob)

    # Force resolve still works (default judgment for Alice)
    direct_vm.sender = direct_alice
    contract.force_resolve_dispute()
    assert contract.get_state()["status"] == "RESOLVED"
    assert contract.get_state()["who_won"] == "A"
