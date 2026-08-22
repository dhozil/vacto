"""Tests for one-time on-chain party acknowledgment (acknowledge_party).

Each party confirms the contract's immutable commitments reflect their exact
agreement — irreversibly, once per party (no double-verification).
"""

from tests.direct.conftest import commit_hash

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"


def _deploy(direct_deploy, party_a, party_b):
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def _commit_both(direct_vm, c, a, b):
    direct_vm.sender = a
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = b
    c.commit_terms(commit_hash(TERMS, SALT))


def test_acknowledge_recorded_per_party(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.acknowledge_party()
    st = c.get_state()
    assert st["ack_a"] == "1"
    assert st["ack_a_at"] != ""
    assert st["ack_b"] == "0"

    direct_vm.sender = direct_bob
    c.acknowledge_party()
    st = c.get_state()
    assert st["ack_a"] == "1"
    assert st["ack_b"] == "1"
    assert st["ack_b_at"] != ""


def test_acknowledge_one_time_no_double_verification(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.acknowledge_party()
    with direct_vm.expect_revert("Party A has already acknowledged the contract"):
        c.acknowledge_party()

    direct_vm.sender = direct_bob
    c.acknowledge_party()
    with direct_vm.expect_revert("Party B has already acknowledged the contract"):
        c.acknowledge_party()


def test_acknowledge_requires_party(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can acknowledge the contract"):
        c.acknowledge_party()


def test_acknowledge_requires_both_committed(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    c.commit_terms(commit_hash(TERMS, SALT))

    with direct_vm.expect_revert(
        "Both parties must commit before the contract can be acknowledged"
    ):
        c.acknowledge_party()


def test_acknowledge_blocked_after_dispute(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.open_dispute(TERMS, SALT)

    with direct_vm.expect_revert("Cannot acknowledge when status is DISPUTED"):
        c.acknowledge_party()