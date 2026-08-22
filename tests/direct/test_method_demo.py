"""Interactive demo: exercise every public method in the praetor-style flow.

Run with: pytest tests/direct/test_method_demo.py -s   (shows transcript)
"""

import json

from tests.direct.conftest import commit_hash, to_hex

TERMS = "\n---\n".join(
    [
        "1. AGREEMENT. Provider shall deliver 100 widgets to Client by March 1st for 50 GEN.",
        "2. QUALITY. All widgets shall pass inspection and be free from defects.",
        "3. PAYMENT. Client shall pay within 14 days of accepted delivery.",
    ]
)
SALT = "s3cr3t-s4lt-0f1a9b2c3d4e5f6a"
URL_A = "https://courier.example.com/tracking/ABC123"


def _show(vm, c):
    s = c.get_state()
    print(
        f"      status={s['status']!r} reviewed_a={s['evidence_reviewed_a']}"
        f" reviewed_b={s['evidence_reviewed_b']} who_won={s.get('who_won','')!r}"
    )


def test_method_demo_transcript(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    print("\n=== DEPLOY ===")
    c = direct_deploy("contracts/private_p2p_contract.py", direct_alice, direct_bob)
    _show(direct_vm, c)

    print("\n=== VIEWS ===")
    direct_vm.sender = direct_alice
    print(f"  is_private()      -> {c.is_private()}")
    print(f"  am_i_party()      -> {c.am_i_party()}")

    print("\n=== COMMIT (each party, own tx) ===")
    direct_vm.sender = direct_alice
    c.commit_terms(commit_hash(TERMS, SALT))
    _show(direct_vm, c)
    direct_vm.sender = direct_bob
    c.commit_terms(commit_hash(TERMS, SALT))
    _show(direct_vm, c)

    print("\n=== OPEN DISPUTE (party A) ===")
    direct_vm.sender = direct_alice
    c.open_dispute(TERMS, SALT)
    _show(direct_vm, c)

    print("\n=== SUBMIT STATEMENTS ===")
    direct_vm.sender = direct_alice
    c.submit_statement("I delivered 100 widgets on time (courier proof attached).")
    direct_vm.sender = direct_bob
    c.submit_statement("Consignment arrived late; 6 units defective per inspection.")
    _show(direct_vm, c)

    print("\n=== GATE: try resolve before evidence -> BLOCKED ===")
    direct_vm.sender = direct_alice
    try:
        c.resolve_dispute()
        print("  !! unexpectedly resolved")
    except Exception as e:
        print(f"  revert: {e}")

    print("\n=== SUBMIT EVIDENCE (party A: URL; party B: none) ===")
    direct_vm.sender = direct_alice
    c.submit_evidence([URL_A])
    _show(direct_vm, c)
    direct_vm.sender = direct_bob
    c.submit_evidence([])
    _show(direct_vm, c)

    print("\n=== GATE: try resolve after both -> OPEN ===")
    direct_vm.mock_web(
        "courier\\.example\\.com",
        {"status": 200, "body": "CONSIGNMENT ABC123 | QTY 100 | SIGNED March 1 | DELIVERED"},
    )
    direct_vm.mock_llm(
        r".*impartial arbitrator.*",
        json.dumps(
            {
                "who_won": "A",
                "verdict": "Provider wins: courier page confirms signed on-time delivery.",
                "reasoning": "STEP 1-4: terms, claims, fetched evidence support A.",
            }
        ),
    )
    direct_vm.sender = direct_alice
    c.resolve_dispute()
    _show(direct_vm, c)

    s = c.get_state()
    print("\n=== RESULT ===")
    print(f"  status     = {s['status']}")
    print(f"  who_won    = {s['who_won']}")
    print(f"  verdict    = {s['verdict']}")
    print(f"  attempts   = {s['resolve_attempts']}")
    print(f"  evidence_a = {s['evidence_a']}")
    print(f"  evidence_b = {s['evidence_b']}")
    assert s["status"] == "RESOLVED"
    assert s["who_won"] == "A"
    assert s["evidence_reviewed_a"] == "1"
    assert s["evidence_reviewed_b"] == "1"