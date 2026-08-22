"""Strong-evidence arbitration scenario.

Both parties commit a professional agreement, open a dispute, and each submits
rich statements + on-chain evidence URLs. The AI jury fetches BOTH pages inside
the non-deterministic block and is expected to produce an accurate consensus
ruling — and validators must REJECT a divergent ruling (consensus safety).
"""

import json
import re

from tests.direct.conftest import commit_hash

TERMS = "\n---\n".join(
    [
        "1. AGREEMENT. Provider shall deliver 100 widgets to Client by March 1st for 50 GEN.",
        "2. QUALITY. All widgets shall pass inspection and be free from manufacturing defects.",
        "3. DELIVERY. Delivery is deemed complete on signing of the courier consignment.",
        "4. PAYMENT. Client shall pay within 14 days of accepted delivery.",
    ]
)
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"
URL_A = "https://courier.example.com/tracking/ABC123"
URL_B = "https://inspection.example.com/report/901"


def _deploy(direct_deploy, a, b):
    return direct_deploy("contracts/private_p2p_contract.py", a, b)


def _setup(direct_vm, c, a, b):
    direct_vm.sender = a
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = b
    c.commit_terms(commit_hash(TERMS, SALT))
    direct_vm.sender = a
    c.open_dispute(TERMS, SALT)


def _strong_evidence(direct_vm, c, a, b):
    # Party A: on-time full delivery with courier proof.
    direct_vm.sender = a
    c.submit_statement(
        "I (Provider) manufactured and shipped all 100 widgets, which left our "
        "warehouse on Feb 25 and were signed for by Client on Feb 28. Courier "
        "tracking ABC123 confirms the consignment weight (100 units) and a "
        "signature by Client's receiving clerk. I invoiced the 50 GEN on "
        "acceptance."
    )
    c.submit_evidence([URL_A])
    # Party B: late delivery + defects with inspection proof.
    direct_vm.sender = b
    c.submit_statement(
        "I (Client) acknowledge one consignment arrived, but it arrived on "
        "March 4 (after the March 1 deadline) and a 20-unit random inspection "
        "found 6 defective units, so I cannot accept the delivery or pay."
    )
    c.submit_evidence([URL_B])


def _mock_pages(vm):
    # Courier page: confirms signed delivery, quantity 100, dated Feb 28.
    vm.mock_web(
        re.escape(URL_A),
        {
            "status": 200,
            "body": (
                "CONSIGNMENT ABC123 | ORIGIN: Provider WH | DEST: Client HQ | "
                "QTY: 100 units | SIGNED: Client receiving clerk on Feb 28 | "
                "STATUS: DELIVERED"
            ),
        },
    )
    # Inspection page: reports defects found in a SAMPLE, not the whole lot.
    vm.mock_web(
        re.escape(URL_B),
        {
            "status": 200,
            "body": (
                "INSPECTION 901 | SAMPLE: 20 units of lot X | DEFECTS FOUND: 6 | "
                "CONDITION: units inspected do not meet spec | NOTE: sample only, "
                "full-lot acceptance not assessed"
            ),
        },
    )


def test_strong_evidence_accurate_consensus_ruling(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _setup(direct_vm, c, direct_alice, direct_bob)
    _strong_evidence(direct_vm, c, direct_alice, direct_bob)
    _mock_pages(direct_vm)

    # Leader rules for A: courier page proves signed on-time delivery, and B's
    # inspection only sampled a subset — does not disprove the whole consignment.
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": "A",
                "verdict": (
                    "Provider wins. Courier tracking ABC123 confirms 100 units "
                    "delivered and signed for on Feb 28 (before March 1). Client's "
                    "inspection covered only a 20-unit sample and does not prove "
                    "the full consignment was late or defective."
                ),
                "reasoning": (
                    "STEP 1 — terms require 100 widgets by March 1 and payment "
                    "within 14 days. STEP 2 — Provider claims on-time delivery; "
                    "Client claims late arrival and sampled defects. STEP 3 — the "
                    "fetched courier page directly confirms signed delivery on "
                    "Feb 28; the fetched inspection page confirms only 6 defects "
                    "in a 20-unit sample, insufficient to establish breach of the "
                    "whole delivery. STEP 4 — Provider's position is supported by "
                    "fetched evidence, so rule A."
                ),
            }
        ),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()

    s = c.get_state()
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "A"
    assert "courier tracking" in s["verdict"].lower() or "ABC123" in s["verdict"]
    assert s["evidence_a"] == [URL_A]
    assert s["evidence_b"] == [URL_B]
    assert s["resolve_attempts"] == "1"


def test_validator_rejects_divergent_ruling(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Consensus safety: a validator whose own re-run picks a different winner
    must NOT agree, so the ruling is not stored."""
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _setup(direct_vm, c, direct_alice, direct_bob)
    _strong_evidence(direct_vm, c, direct_alice, direct_bob)
    _mock_pages(direct_vm)

    # First resolution: leader and validator both rule A -> consensus, stored.
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps({"who_won": "A", "verdict": "Provider wins.", "reasoning": "Supported."}),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    assert c.get_state()["who_won"] == "A"

    # Now simulate an independent validator whose own re-run disagrees (B).
    direct_vm.clear_mocks()
    _mock_pages(direct_vm)
    direct_vm.mock_llm(r".*impartial arbitrator.*", json.dumps({"who_won": "B"}))
    assert direct_vm.run_validator() is False


def test_ambiguous_evidence_yields_draw(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When fetched evidence is genuinely ambiguous, the jury rules DRAW rather
    than forcing a winner."""
    c = _deploy(direct_deploy, direct_alice, direct_bob)
    _setup(direct_vm, c, direct_alice, direct_bob)
    _strong_evidence(direct_vm, c, direct_alice, direct_bob)

    # Both pages are 'password protected' (unreadable) -> claims unverifiable.
    direct_vm.mock_web(re.escape(URL_A), {"status": 403, "body": "Forbidden"})
    direct_vm.mock_web(re.escape(URL_B), {"status": 403, "body": "Forbidden"})
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": "DRAW",
                "verdict": "Both evidence pages were unavailable; neither claim "
                "could be verified against fetched content.",
                "reasoning": "No verifiable evidence; per the evidence rule the "
                "jury fell back to the terms, which are ambiguous as to the "
                "disputed facts. Rule DRAW.",
            }
        ),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    s = c.get_state()
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "DRAW"