"""Tests for the commit phase of the commit/reveal scheme.

Run with: pytest tests/direct/ -v
"""

from tests.direct.conftest import to_hex, commit_hash

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"


def _deploy(direct_deploy, party_a, party_b):
    # Address() in the contract accepts raw 20-byte values directly.
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def test_commit_flow_reaches_active(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    alice = to_hex(direct_alice)

    assert contract.get_state()["status"] == "CREATED"

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    state = contract.get_state()
    assert state["status"] == "PARTIAL"
    assert state["commit_a"] == commit_hash(TERMS, SALT)
    assert state["commit_b"] == ""
    assert contract.is_private() is True

    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS, SALT))
    state = contract.get_state()
    assert state["status"] == "ACTIVE"
    assert state["commit_a"] == state["commit_b"]
    # Still private: the actual terms were never stored.
    assert state["terms"] == ""
    assert contract.is_private() is True


def test_only_parties_can_commit(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can commit terms"):
        contract.commit_terms(commit_hash(TERMS, SALT))


def test_duplicate_commit_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))

    with direct_vm.expect_revert("Party A has already committed"):
        contract.commit_terms(commit_hash(TERMS, SALT))


def test_mismatched_commits_flag_disagreement(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))

    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS + " different", SALT))

    state = contract.get_state()
    assert state["status"] == "MISMATCHED"
    # Even in disagreement nothing sensitive is stored.
    assert state["terms"] == ""


def test_reset_requires_both_parties(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS + " different", SALT))
    assert contract.get_state()["status"] == "MISMATCHED"

    # One party alone cannot wipe the whole contract.
    direct_vm.sender = direct_bob
    contract.reset_commits()
    state = contract.get_state()
    assert state["status"] == "MISMATCHED"
    assert state["commit_a"] != "" and state["commit_b"] != ""
    assert state["reset_b"] == "1"

    # Second consent performs the reset.
    direct_vm.sender = direct_alice
    contract.reset_commits()
    state = contract.get_state()
    assert state["status"] == "CREATED"
    assert state["commit_a"] == ""
    assert state["commit_b"] == ""
    assert state["reset_a"] == "0" and state["reset_b"] == "0"


def test_retract_own_commit_does_not_touch_other(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS + " different", SALT))
    assert contract.get_state()["status"] == "MISMATCHED"

    # B retracts only its own commitment; A's stays, no full wipe.
    direct_vm.sender = direct_bob
    contract.retract_commit()

    state = contract.get_state()
    assert state["status"] == "PARTIAL"
    assert state["commit_b"] == ""
    assert state["commit_a"] == commit_hash(TERMS, SALT)

    # B cannot retract A's commitment.
    with direct_vm.expect_revert("Party B has no commitment to retract"):
        contract.retract_commit()

    # B re-commits matching A -> ACTIVE without any reset needed.
    direct_vm.sender = direct_bob
    contract.commit_terms(commit_hash(TERMS, SALT))
    assert contract.get_state()["status"] == "ACTIVE"


def test_commit_requires_valid_hex_digest(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Commit must be a 64-character hex digest"):
        contract.commit_terms("not-a-hash")