"""Tests for anti-correlation (HMAC keyed commit) and partial clause reveal.

Run with: pytest tests/direct/ -v
"""

import hashlib

from tests.direct.conftest import (
    commit_hash,
    clause_hash,
    split_clauses,
)

TERMS = (
    "Deliver 100 widgets by March 1st for 50 GEN\n---\n"
    "Warranty covers manufacturing defects\n---\n"
    "Payment due within 30 days of delivery"
)
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"

CLAUSES = split_clauses(TERMS)


def _deploy(direct_deploy, party_a, party_b):
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def _commit_both(direct_vm, contract, alice, bob):
    direct_vm.sender = alice
    contract.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = bob
    contract.commit_terms(commit_hash(TERMS, SALT))


def _clause_hashes():
    return [clause_hash(c, SALT, i) for i, c in enumerate(CLAUSES)]


def test_plain_sha256_commit_cannot_be_revealed(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """A plain sha256(terms+salt) digest passes commit but fails at reveal —
    the on-chain record must be the keyed HMAC, which is what defeats offline
    dictionary/correlation attacks on the terms."""
    direct_vm.sender = direct_alice
    plain = hashlib.sha256((TERMS + SALT).encode("utf-8")).hexdigest()
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    contract.commit_terms(plain)
    direct_vm.sender = direct_bob
    contract.commit_terms(plain)

    assert contract.get_state()["status"] == "ACTIVE"

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Revealed terms do not match the committed hash"):
        contract.open_dispute(TERMS, SALT)


def test_keyed_commit_reveals_fine(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.open_dispute(TERMS, SALT)
    state = contract.get_state()
    assert state["status"] == "DISPUTED"
    assert state["terms"] == TERMS


def test_salt_too_short_rejected_on_open_dispute(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    short_salt = "s3cr3t-42"  # 10 chars < _MIN_SALT (16)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Salt must be at least 16 characters long"):
        contract.open_dispute(TERMS, short_salt)


def test_partial_reveal_records_only_one_clause(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)
    hashes = _clause_hashes()

    # Both parties record identical per-clause digests.
    direct_vm.sender = direct_alice
    contract.commit_clauses(hashes)
    direct_vm.sender = direct_bob
    contract.commit_clauses(hashes)

    state = contract.get_state()
    assert state["clause_commits"] == hashes
    assert state["terms"] == ""

    # Reveal ONE clause; the rest of the terms stay private on-chain.
    direct_vm.sender = direct_alice
    contract.reveal_clause(0, CLAUSES[0], SALT)

    state = contract.get_state()
    assert state["status"] == "ACTIVE"
    assert state["terms"] == ""
    assert state["revealed_clauses"] == {"0": CLAUSES[0]}

    # Wrong text for the same index is rejected.
    with direct_vm.expect_revert("Clause text does not match the committed digest"):
        contract.reveal_clause(0, CLAUSES[0] + " tampered", SALT)

    # The other party reveals a different clause; previous reveal persists.
    direct_vm.sender = direct_bob
    contract.reveal_clause(2, CLAUSES[2], SALT)

    state = contract.get_state()
    assert state["revealed_clauses"] == {"0": CLAUSES[0], "2": CLAUSES[2]}

    # Out-of-range index is rejected.
    with direct_vm.expect_revert("Clause index out of range"):
        contract.reveal_clause(len(CLAUSES), CLAUSES[0], SALT)


def test_clause_commitments_must_match(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.commit_clauses(_clause_hashes())

    # Bob splits differently -> different per-clause digests.
    other_list = [
        clause_hash(CLAUSES[0] + " (amended)", SALT, 0),
        clause_hash(CLAUSES[1], SALT, 1),
        clause_hash(CLAUSES[2], SALT, 2),
    ]
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Clause commitments do not match between parties"):
        contract.commit_clauses(other_list)


def test_reveal_requires_recorded_commitments(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("No clause commitments recorded"):
        contract.reveal_clause(0, CLAUSES[0], SALT)


def test_stranger_cannot_commit_or_reveal_clauses(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_both(direct_vm, contract, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can commit clause digests"):
        contract.commit_clauses(_clause_hashes())
    with direct_vm.expect_revert("Only the two parties can reveal a clause"):
        contract.reveal_clause(0, CLAUSES[0], SALT)