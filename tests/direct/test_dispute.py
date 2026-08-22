"""Tests for AI-powered dispute arbitration via GenLayer equivalence principle.

Run with: pytest tests/direct/ -v
"""

import json

from tests.direct.conftest import commit_hash, mark_evidence_both

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"


def _deploy(direct_deploy, party_a, party_b):
    # Address() in the contract accepts raw 20-byte values directly.
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_alice
    contract.open_dispute(TERMS, SALT)
    mark_evidence_both(direct_vm, contract, direct_alice, direct_bob)


def _setup_arbitration_mocks(vm, who_won="A"):
    """Mock the arbitrate LLM prompt.

    With `run_nondet_unsafe` the leader AND every validator re-run the same
    task; the mock returns the same ruling for both, so consensus on the
    `who_won` decision field is trivially reached.
    """
    vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": who_won,
                "verdict": "Party A meets the agreed terms.",
                "reasoning": "The revealed terms support Party A.",
            }
        ),
    )


def test_full_dispute_resolution(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob)
    _setup_arbitration_mocks(direct_vm, who_won="A")

    direct_vm.sender = direct_alice
    contract.submit_statement("I delivered on time and Bob did not pay.")
    direct_vm.sender = direct_bob
    contract.submit_statement("The widgets were defective.")

    contract.resolve_dispute()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"
    assert state["who_won"] == "A"
    assert "meets the agreed terms" in state["verdict"]
    assert state["terms"] == TERMS


def test_resolve_requires_both_statements(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob)
    _setup_arbitration_mocks(direct_vm)

    direct_vm.sender = direct_alice
    contract.submit_statement("Only Alice's statement.")

    with direct_vm.expect_revert(
        "Both parties must submit a statement before the dispute can be resolved"
    ):
        contract.resolve_dispute()


def test_cannot_resolve_without_dispute(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _setup_arbitration_mocks(direct_vm)

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS, SALT))

    with direct_vm.expect_revert("No dispute to resolve"):
        contract.resolve_dispute()


def test_statement_only_from_parties(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can submit a statement"):
        contract.submit_statement("Intruder statement")


def test_statement_overwrite_allowed(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob)

    # A may revise its own statement (keeps the flow un-deadlockable).
    direct_vm.sender = direct_alice
    contract.submit_statement("First statement")
    contract.submit_statement("Revised statement")

    assert contract.get_state()["statement_a"] == "Revised statement"


def test_stranger_cannot_resolve(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.submit_statement("Alice's statement.")
    direct_vm.sender = direct_bob
    contract.submit_statement("Bob's statement.")

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can resolve the dispute"):
        contract.resolve_dispute()


def test_validator_agrees_only_on_identical_winner(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """The custom run_nondet_unsafe validator compares ONLY the decision
    field. If a validator's own re-run picks a different winner, consensus
    must be rejected."""
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_and_dispute(direct_vm, contract, direct_alice, direct_bob)
    _setup_arbitration_mocks(direct_vm, who_won="A")

    direct_vm.sender = direct_alice
    contract.submit_statement("Alice statement")
    direct_vm.sender = direct_bob
    contract.submit_statement("Bob statement")

    # Leader and validator both answer with A -> consensus reached.
    contract.resolve_dispute()
    assert contract.get_state()["who_won"] == "A"

    # Simulate a validator whose own re-run disagrees on the winner.
    direct_vm.clear_mocks()
    _setup_arbitration_mocks(direct_vm, who_won="B")
    assert direct_vm.run_validator() is False