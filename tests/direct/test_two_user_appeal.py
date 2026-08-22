"""Two-user head-to-head dispute: both parties appeal (submit + rebut) against
each other through statements, evidence, clarification and revisions, until
both complete input and the AI jury reaches consensus.

Run with: pytest tests/direct/test_two_user_appeal.py -v
"""

import json
import re

from tests.direct.conftest import commit_hash, to_hex

TERMS = "\n---\n".join(
    [
        "1. AGREEMENT. Provider shall deliver 100 widgets to Client by March 1st for 50 GEN.",
        "2. QUALITY. All widgets shall pass inspection.",
        "3. PAYMENT. Client shall pay within 14 days of accepted delivery.",
    ]
)
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"
URL_A = "https://courier.example.com/track/AB1"
URL_B = "https://inspection.example.com/rep/2"


def _deploy(direct_deploy, a, b):
    return direct_deploy("contracts/private_p2p_contract.py", a, b)


def _commit_open(direct_vm, c, a, b):
    direct_vm.sender = a
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = b
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = a
    c.open_dispute(TERMS, SALT)


def _mock_pages(vm):
    vm.mock_web(
        re.escape(URL_A),
        {"status": 200, "body": "TRACK AB1 | QTY 100 | signed Mar 1 | DELIVERED"},
    )
    vm.mock_web(
        re.escape(URL_B),
        {"status": 200, "body": "REP 2 | sample 10 units | 3 defective | sample only"},
    )


def test_two_users_appeal_until_consensus(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_open(direct_vm, c, direct_alice, direct_bob)
    _mock_pages(direct_vm)

    # ── Round 1: A accuses, B rebuts ───────────────────────────────────
    direct_vm.sender = direct_alice
    c.submit_statement(
        "I delivered all 100 widgets exactly on March 1, signed by your clerk."
    )
    c.submit_evidence([URL_A])
    direct_vm.sender = direct_bob
    c.submit_statement(
        "You delivered late and 3 of 10 inspected units are defective — proof attached."
    )
    c.submit_evidence([URL_B])

    # B nudges A to clarify the alleged date discrepancy.
    direct_vm.sender = direct_bob
    c.request_clarification()
    assert c.get_state()["clarification_requested_by"] == to_hex(direct_bob)

    # ── Round 2: A revises (responds to the rebuttal) ──────────────────
    direct_vm.sender = direct_alice
    c.submit_statement(
        "Revision: the inspection sampled only 10 units; the tracking page shows "
        "the whole 100 delivered and signed on time. Quality acceptance applied."
    )
    assert c.get_state()["statement_a_version"] == "2"
    assert c.get_state()["statement_a_updated_at"] != ""

    # A also flags B's own wording for a revision.
    direct_vm.sender = direct_alice
    c.request_clarification()
    assert c.get_state()["clarification_requested_by"] == to_hex(direct_alice)

    # ── Both complete evidence input (A already did; B replaces with same) ──
    direct_vm.sender = direct_bob
    c.submit_evidence([URL_B])
    assert c.get_state()["evidence_reviewed_a"] == "1"
    assert c.get_state()["evidence_reviewed_b"] == "1"

    # ── Resolve: the jury weighs both fetched pages ────────────────────
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": "A",
                "verdict": (
                    "Provider wins: tracking AB1 confirms the full 100-unit "
                    "consignment delivered and signed on March 1; the client's "
                    "inspection only covers a 10-unit sample and does not prove "
                    "the whole delivery was defective."
                ),
                "reasoning": (
                    "Step 1-4 after both appeals: A's claim is directly supported "
                    "by the fetched tracking page; B's claim rests on a partial "
                    "sample. Rule A."
                ),
            }
        ),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()

    s = c.get_state()
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "A"
    assert s["statement_a_version"] == "2"
    assert s["statement_b_version"] == "1"
    # Both fetched pages were snapshotted by digest.
    assert set(s["evidence_digests"].keys()) == {URL_A, URL_B}
    assert s["evidence_digests"][URL_A]
    assert s["evidence_digests"][URL_B]
    assert s["clarification_requested_by"] == to_hex(direct_alice)
    assert s["resolve_attempts"] == "1"


def test_two_users_conflicting_evidence_ruled_fairly(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When both sides provide genuine but irreconcilable evidence and the
    terms cannot settle it, the jury must not force a winner (DRAW)."""
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _commit_open(direct_vm, c, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    c.submit_statement("I delivered on time per my log.")
    c.submit_evidence([URL_A])
    direct_vm.sender = direct_bob
    c.submit_statement("Gateway shows late arrival; I reject.")
    c.submit_evidence([URL_B])

    # Both pages take the same time window but no ground truth exists.
    direct_vm.mock_web(re.escape(URL_A), {"status": 200, "body": "arrived Mar 1 (log A)"})
    direct_vm.mock_web(re.escape(URL_B), {"status": 200, "body": "arrived Mar 4 (gate B)"})
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": "DRAW",
                "verdict": "Both evidence pages conflict with no independent "
                "verification; the terms are ambiguous.",
                "reasoning": "Fetched pages disagree; per evidence rule, rule DRAW.",
            }
        ),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    assert c.get_state()["who_won"] == "DRAW"