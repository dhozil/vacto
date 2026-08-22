"""Tests for the anti-stall deadline features.

Covers: event timestamps, the completion response window + force_completion,
dispute-request expiry, the resolution window, default-judgment force-resolve,
and AI force-resolve with both statements present.

Time is warped with direct_vm.warp() — the direct VM patches datetime.now()
to the warped timestamp, and the contract reads the timestamp through it.

Run with: pytest tests/direct/ -v
"""

import json

from tests.direct.conftest import to_hex, commit_hash

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"

BASE = "2026-01-01T00:00:00Z"
HOUR = 3600


def _deploy(direct_deploy, party_a, party_b, at=BASE):
    direct_vm = None  # warping is done by the caller around deploy
    contract = direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)
    return contract


def _commit_both(direct_vm, contract, alice, bob):
    direct_vm.sender = alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = bob
    contract.commit_terms(commit_hash(TERMS, SALT))


def _open_dispute(direct_vm, contract, alice):
    direct_vm.sender = alice
    contract.open_dispute(TERMS, SALT)


def _mock_arbitration(vm, who_won="A"):
    vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": who_won,
                "verdict": "Party A is right.",
                "reasoning": "The revealed terms support Party A.",
            }
        ),
    )


def test_events_record_timestamps(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_bob
    contract.request_dispute()

    direct_vm.sender = direct_alice
    contract.open_dispute(TERMS, SALT)

    state = contract.get_state()
    assert state["created_at"] == BASE
    assert state["commit_a_at"] == BASE
    assert state["commit_b_at"] == BASE
    assert state["dispute_requested_at"] == BASE
    assert state["dispute_opened_at"] == BASE
    # 30-day default resolution window starting at BASE.
    assert state["resolve_deadline"] == "2026-01-31T00:00:00Z"
    assert state["open_dispute_deadline"] == ""
    assert state["resolved_at"] == ""


def test_force_completion_after_response_window(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract._RESPONSE_WINDOW_SECONDS = HOUR
    alice = to_hex(direct_alice)

    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.request_completion()

    state = contract.get_state()
    assert state["completion_requested_at"] == BASE
    assert state["completion_requested_by"] == alice

    # Window not elapsed yet -> force fails.
    direct_vm.warp("2026-01-01T00:30:00Z")
    with direct_vm.expect_revert("The completion response window has not elapsed yet"):
        contract.force_completion()

    # Window elapsed, but only the original requester may force.
    direct_vm.warp("2026-01-01T01:00:00Z")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the party who requested completion can force it"):
        contract.force_completion()

    direct_vm.sender = direct_alice
    contract.force_completion()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"
    assert state["terms"] == ""
    assert "response window" in state["verdict"]
    assert state["resolved_at"] == "2026-01-01T01:00:00Z"


def test_dispute_request_expires_and_unlocks_completion(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract._DISPUTE_OPEN_WINDOW_SECONDS = HOUR

    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_bob
    contract.request_dispute()

    # Active request locks completion.
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("A dispute has been requested; completion is locked"):
        contract.request_completion()

    # After the open window, the abandoned request expires and unlocks it.
    direct_vm.warp("2026-01-01T02:00:00Z")
    contract.request_completion()
    direct_vm.sender = direct_bob
    contract.request_completion()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"
    assert state["terms"] == ""
    assert state["dispute_requested"] == "0"
    assert state["completion_requested_at"] == ""


def test_open_dispute_requires_agreed_commit(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice)

    state = contract.get_state()
    assert state["status"] == "DISPUTED"
    assert state["resolve_deadline"] == "2026-01-31T00:00:00Z"
    assert state["dispute_opened_at"] == BASE


def test_force_resolve_default_judgment(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract._RESOLVE_WINDOW_SECONDS = HOUR

    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice)

    # Only party A responds before the deadline.
    direct_vm.sender = direct_alice
    contract.submit_statement("I delivered on time and Bob did not pay.")

    # Cooperative resolve still requires both statements.
    with direct_vm.expect_revert(
        "Both parties must submit a statement before the dispute can be resolved"
    ):
        contract.resolve_dispute()

    # Before the deadline the force path is locked.
    direct_vm.warp("2026-01-01T00:30:00Z")
    with direct_vm.expect_revert("The resolution deadline has not passed yet"):
        contract.force_resolve_dispute()

    # After the deadline -> default judgment for A.
    direct_vm.warp("2026-01-01T02:00:00Z")
    contract.force_resolve_dispute()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"
    assert state["who_won"] == "A"
    assert "Default judgment" in state["verdict"]
    assert state["resolved_at"] == "2026-01-01T02:00:00Z"


def test_force_resolve_with_both_statements_runs_ai(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract._RESOLVE_WINDOW_SECONDS = HOUR
    _mock_arbitration(direct_vm, who_won="A")

    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice)

    direct_vm.sender = direct_alice
    contract.submit_statement("I delivered on time and Bob did not pay.")
    direct_vm.sender = direct_bob
    contract.submit_statement("The widgets were defective.")

    # Bob triggers the force path after the deadline; both statements are in,
    # so it is the same AI consensus arbitration.
    direct_vm.warp("2026-01-01T02:00:00Z")
    contract.force_resolve_dispute()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"
    assert state["who_won"] == "A"
    assert "right" in state["verdict"]


def test_force_resolve_no_statements_fails(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract._RESOLVE_WINDOW_SECONDS = HOUR

    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice)

    direct_vm.warp("2026-01-01T02:00:00Z")
    with direct_vm.expect_revert("neither party submitted a statement"):
        contract.force_resolve_dispute()


def test_stranger_cannot_force_resolve(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    direct_vm.warp(BASE)
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract._RESOLVE_WINDOW_SECONDS = HOUR

    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    _open_dispute(direct_vm, contract, direct_alice)

    direct_vm.sender = direct_charlie
    direct_vm.warp("2026-01-01T02:00:00Z")
    with direct_vm.expect_revert("Only the two parties can resolve the dispute"):
        contract.force_resolve_dispute()