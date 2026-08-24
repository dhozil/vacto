"""Integration tests — require GenLayer Studio running.

Run with: gltest tests/integration/ -v -s
"""

import hashlib
import hmac

import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"


def commit_hash(terms: str, salt: str) -> str:
    return hmac.new(salt.encode("utf-8"), terms.encode("utf-8"), hashlib.sha256).hexdigest()


@pytest.mark.integration
def deploy_contract(default_account, accounts):
    factory = get_contract_factory("PrivateP2PContract")
    contract = factory.deploy(
        args=[default_account.address, accounts[1].address],
        account=default_account,
    )

    state = contract.get_state(args=[])
    assert state["status"] == "CREATED"
    assert state["terms"] == ""
    return contract, default_account, accounts[1]


@pytest.mark.integration
def test_private_completion_never_reveals(default_account, accounts):
    contract, party_a, party_b = deploy_contract(default_account, accounts)

    commit = commit_hash(TERMS, SALT)

    result = contract.commit_terms(args=[commit], account=party_a)
    assert tx_execution_succeeded(result)
    assert contract.get_state(args=[])["status"] == "PARTIAL"

    result = contract.commit_terms(args=[commit], account=party_b)
    assert tx_execution_succeeded(result)
    state = contract.get_state(args=[])
    assert state["status"] == "ACTIVE"
    assert state["terms"] == ""

    # Both parties approve: close privately. Terms are never revealed.
    result = contract.request_completion(args=[], account=party_b)
    assert tx_execution_succeeded(result)
    assert contract.get_state(args=[])["status"] == "ACTIVE"
    result = contract.request_completion(args=[], account=party_a)
    assert tx_execution_succeeded(result)

    state = contract.get_state(args=[])
    assert state["status"] == "RESOLVED"
    assert state["terms"] == ""
    assert "never revealed" in state["verdict"]


@pytest.mark.integration
def test_dispute_reveals_terms_then_arbitrates(default_account, accounts):
    """Full dispute path including LLM arbitration (takes 30-60s)."""
    contract, party_a, party_b = deploy_contract(default_account, accounts)

    commit = commit_hash(TERMS, SALT)

    assert tx_execution_succeeded(contract.commit_terms(args=[commit], account=party_a))
    assert tx_execution_succeeded(contract.commit_terms(args=[commit], account=party_b))

    # Dispute: party B reveals the terms.
    assert tx_execution_succeeded(contract.open_dispute(args=[TERMS, SALT], account=party_b))

    state = contract.get_state(args=[])
    assert state["status"] == "DISPUTED"
    assert state["terms"] == TERMS

    assert tx_execution_succeeded(
        contract.submit_statement(
            args=["I delivered on time, no payment received."], account=party_a
        )
    )
    assert tx_execution_succeeded(
        contract.submit_statement(
            args=["Deliverables were defective and late."], account=party_b
        )
    )

    # Both parties complete their evidence input before resolution.
    assert tx_execution_succeeded(contract.submit_evidence(args=[[]], account=party_a))
    assert tx_execution_succeeded(contract.submit_evidence(args=[[]], account=party_b))
    state = contract.get_state(args=[])
    assert state["evidence_reviewed_a"] == "1"
    assert state["evidence_reviewed_b"] == "1"

    # AI arbitration with multi-validator consensus.
    result = contract.resolve_dispute(args=[], account=party_a, wait_interval=10000, wait_retries=15)
    assert tx_execution_succeeded(result)

    state = contract.get_state(args=[])
    assert state["status"] == "RESOLVED"
    assert state["who_won"] in ("A", "B", "DRAW")
    assert state["verdict"] != ""
    assert state["reasoning"] != ""