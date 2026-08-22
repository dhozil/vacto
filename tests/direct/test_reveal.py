"""Tests for reveal-on-dispute and private completion flows.

Run with: pytest tests/direct/ -v
"""

from tests.direct.conftest import to_hex, commit_hash

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"


def _deploy(direct_deploy, party_a, party_b):
    # Address() in the contract accepts raw 20-byte values directly.
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def _commit_both(direct_vm, contract, direct_alice, direct_bob, terms=TERMS, salt=SALT):
    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(terms, salt))
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(terms, salt))


def test_open_dispute_reveals_terms(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    alice = to_hex(direct_alice)

    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    assert contract.is_private() is True
    direct_vm.sender = direct_alice
    contract.open_dispute(TERMS, SALT)

    state = contract.get_state()
    assert state["status"] == "DISPUTED"
    # Terms are now public on-chain.
    assert state["terms"] == TERMS
    assert state["revealed_by"] == alice
    assert contract.is_private() is False


def test_open_dispute_rejects_wrong_terms(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Revealed terms do not match the committed hash"):
        contract.open_dispute(TERMS + " tampered", SALT)

    # Nothing was revealed.
    assert contract.get_state()["status"] == "ACTIVE"
    assert contract.get_state()["terms"] == ""


def test_open_dispute_requires_active(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Cannot open a dispute when status is CREATED"):
        contract.open_dispute(TERMS, SALT)


def test_complete_contract_stays_private(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    # Both parties approve — close it privately, no reveal.
    direct_vm.sender = direct_bob
    contract.request_completion()
    direct_vm.sender = direct_alice
    contract.request_completion()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"
    assert "never revealed" in state["verdict"]
    assert state["terms"] == ""
    assert "who_won" not in state or state["who_won"] == ""


def test_completion_requires_both_parties(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    # A lone approval cannot bury the dispute.
    direct_vm.sender = direct_bob
    contract.request_completion()

    state = contract.get_state()
    assert state["status"] == "ACTIVE"
    assert state["complete_b"] == "1"
    assert state["complete_a"] == "0"


def test_complete_contract_before_active_fails(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Contract must be ACTIVE to complete"):
        contract.request_completion()


def test_request_dispute_blocks_completion(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    # B locks in a dispute... then A cannot complete.
    direct_vm.sender = direct_bob
    contract.request_dispute()

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("A dispute has been requested; completion is locked"):
        contract.request_completion()


def test_withdraw_dispute_request_unlocks_completion(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_bob
    contract.request_dispute()

    # The other party cannot withdraw B's request.
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert(
        "Only the party who requested the dispute can withdraw it"
    ):
        contract.withdraw_dispute_request()

    # B withdraws its own request; completion works again.
    direct_vm.sender = direct_bob
    contract.withdraw_dispute_request()
    contract.request_completion()
    direct_vm.sender = direct_alice
    contract.request_completion()

    state = contract.get_state()
    assert state["status"] == "RESOLVED"


def test_only_parties_can_reveal(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can open a dispute"):
        contract.open_dispute(TERMS, SALT)