"""Tests for evidence-URL arbitration (on-chain page fetching).

The AI jury fetches evidence pages inside the non-deterministic block; direct
mode mocks those with vm.mock_web(). Covers validation, happy path, fallback
when a page is unavailable, and the stronger evidence rule in the prompt.
"""

import json
import re

from tests.direct.conftest import commit_hash, to_hex

TERMS = "Deliver 100 widgets by March 1st for 50 GEN"
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"
URL_A = "https://courier.example.com/tracking/ABC123"
URL_B = "https://inspection.example.com/report/1"


def _deploy(direct_deploy, party_a, party_b):
    return direct_deploy("contracts/private_p2p_contract.py", party_a, party_b)


def _open_dispute(direct_vm, c, a, b):
    direct_vm.sender = a
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = b
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = a
    c.open_dispute(TERMS, SALT)


def _submitting(direct_vm, c, a, b):
    direct_vm.sender = a
    c.submit_statement("I delivered all 100 widgets on time.")
    direct_vm.sender = b
    c.submit_statement("Delivery arrived late and incomplete.")


# ---------------------------------------------------------------- validation


def test_evidence_requires_party(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the two parties can submit evidence"):
        c.submit_evidence([URL_A])


def test_evidence_requires_dispute(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    c.commit_terms(commit_hash(TERMS, SALT))
    with direct_vm.expect_revert("Evidence can only be submitted during an active dispute"):
        c.submit_evidence([URL_A])


def test_evidence_rejects_invalid_url(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Evidence URLs must start with http(s)://"):
        c.submit_evidence(["not-a-url"])
    with direct_vm.expect_revert("Evidence URLs must start with http(s)://"):
        c.submit_evidence(["ftp://example.com/x"])


def test_evidence_caps_count(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    urls = [f"https://example.com/{i}" for i in range(6)]
    with direct_vm.expect_revert("At most 3 evidence URLs are allowed"):
        c.submit_evidence(urls)


def test_evidence_is_party_bound_and_replaceable(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.submit_evidence([URL_A])
    direct_vm.sender = direct_bob
    c.submit_evidence([URL_B])

    s = c.get_state()
    assert s["evidence_a"] == [URL_A]
    assert s["evidence_b"] == [URL_B]

    # Alice replaces her own evidence only
    direct_vm.sender = direct_alice
    c.submit_evidence(["https://example.com/new-proof"])
    s = c.get_state()
    assert s["evidence_a"] == ["https://example.com/new-proof"]
    assert s["evidence_b"] == [URL_B]


# ------------------------------------------------------------ arbitration


def test_resolution_uses_fetched_evidence(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.submit_evidence([URL_A])
    _submitting(direct_vm, c, direct_alice, direct_bob)

    # Party B explicitly marks "no evidence" so both parties completed input.
    direct_vm.sender = direct_bob
    c.submit_evidence([])

    # Tracking page confirms Alice's full delivery.
    direct_vm.mock_web(
        re.escape(URL_A),
        {"status": 200, "body": "Tracking ABC123: delivered 100 widgets, signed March 1."},
    )
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps({"who_won": "A", "verdict": "Evidence confirms delivery.", "reasoning": "Tracking page cited."}),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    s = c.get_state()
    assert s["who_won"] == "A"
    # Immutable snapshot: the exact fetched text that the jury read is recorded
    # as a sha256 digest on-chain.
    digests = s.get("evidence_digests", {})
    assert URL_A in digests and digests[URL_A]
    expect = __import__("hashlib").sha256(
        "Tracking ABC123: delivered 100 widgets, signed March 1.".encode("utf-8")
    ).hexdigest()
    assert digests[URL_A] == expect


def test_resolve_blocked_until_both_mark_evidence(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Praetor-style gate: resolve stays locked while either party has not
    completed their evidence input."""
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)
    _submitting(direct_vm, c, direct_alice, direct_bob)

    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps({"who_won": "A", "verdict": "x", "reasoning": "y"}),
    )

    # Neither party marked evidence yet -> locked.
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert(
        "Both parties must complete their evidence input before the dispute can be resolved"
    ):
        c.resolve_dispute()

    # Only A marks evidence (none) -> still locked.
    direct_vm.sender = direct_alice
    c.submit_evidence([])
    with direct_vm.expect_revert(
        "Both parties must complete their evidence input before the dispute can be resolved"
    ):
        c.resolve_dispute()

    # B marks evidence (none) -> gate satisfied, AI arbitration runs.
    direct_vm.sender = direct_bob
    c.submit_evidence([])
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    assert c.get_state()["status"] == "RESOLVED"


def test_unavailable_evidence_does_not_deadlock(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _open_dispute(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.submit_evidence([URL_A])
    _submitting(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_bob
    c.submit_evidence([])

    # No web mock registered -> fetch fails gracefully; arbitration still runs.
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps({"who_won": "DRAW", "verdict": "Evidence unavailable.", "reasoning": "Fell back to terms."}),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    s = c.get_state()
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "DRAW"