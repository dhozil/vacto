import { describe, it, expect } from "vitest";
import { buildCaseRecordText } from "../lib/contracts/caseExport";
import type { P2PState } from "../lib/contracts/types";

function baseState(overrides: Partial<P2PState> = {}): P2PState {
  return {
    status: "RESOLVED",
    party_a: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    party_b: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    commit_a: "0x".padEnd(66, "a"),
    commit_b: "0x".padEnd(66, "a"),
    terms: "Deliver 100 widgets by March 1st for 50 GEN",
    revealed_by: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    terms_sha256: "",
    salt_sha256: "",
    identity_a: "",
    identity_b: "",
    ack_a: "0",
    ack_b: "0",
    ack_a_at: "",
    ack_b_at: "",
    statement_a: "I delivered on time.",
    statement_b: "The widgets were defective.",
    who_won: "A",
    verdict: "Party A meets the agreed terms.",
    reasoning: "The revealed terms support Party A.",
    complete_a: "0",
    complete_b: "0",
    dispute_requested: "1",
    dispute_requested_by: "",
    reset_a: "0",
    reset_b: "0",
    clauses_sent_a: "0",
    clauses_sent_b: "0",
    clause_commits: [],
    revealed_clauses: {},
    evidence_a: [],
    evidence_b: [],
    evidence_reviewed_a: "0",
    evidence_reviewed_b: "0",
    evidence_digests: {},
    created_at: "2026-01-01T00:00:00Z",
    commit_a_at: "2026-01-02T00:00:00Z",
    commit_b_at: "2026-01-02T00:00:00Z",
    completion_requested_at: "",
    completion_requested_by: "",
    dispute_requested_at: "",
    open_dispute_deadline: "",
    dispute_opened_at: "2026-01-03T00:00:00Z",
    resolve_deadline: "2026-02-02T00:00:00Z",
    resolved_at: "2026-02-02T00:00:00Z",
    statement_a_updated_at: "2026-01-04T00:00:00Z",
    statement_b_updated_at: "2026-01-05T00:00:00Z",
    statement_a_version: "1",
    statement_b_version: "1",
    clarification_requested_at: "",
    clarification_requested_by: "",
    resolve_attempts: "1",
    ...overrides,
  };
}

describe("buildCaseRecordText", () => {
  it("includes header, parties, terms, verdict and timeline", () => {
    const text = buildCaseRecordText(baseState());
    expect(text).toContain("VACTO — CASE RECORD");
    expect(text).toContain("Status:");
    expect(text).toContain("RESOLVED");
    expect(text).toContain("Deliver 100 widgets by March 1st for 50 GEN");
    expect(text).toContain("Ruling:  Party A");
    expect(text).toContain("Party A meets the agreed terms.");
    expect(text).toContain("Resolved:");
  });

  it("marks a dispute-resolved record as revealed", () => {
    const text = buildCaseRecordText(baseState());
    expect(text).toContain("REVEALED on-chain");
  });

  it("marks a private completion as never-revealed", () => {
    const text = buildCaseRecordText(
      baseState({ terms: "", who_won: "", verdict: "Contract completed privately." })
    );
    expect(text).toContain("NEVER revealed");
    expect(text).not.toContain("REVEALED on-chain");
  });

  it("includes revealed clause proofs when present", () => {
    const state = baseState({
      clause_commits: ["ab".repeat(32), "cd".repeat(32)],
      revealed_clauses: { "0": "Deliver 100 widgets by March 1st" },
    });
    const text = buildCaseRecordText(state);
    expect(text).toContain("Per-clause commitments recorded: 2");
    expect(text).toContain("[0] Deliver 100 widgets by March 1st");
  });

  it("includes evidence URLs when present", () => {
    const text = buildCaseRecordText(
      baseState({
        evidence_a: ["https://courier.example.com/t"],
        evidence_b: ["https://inspection.example.com/r"],
      })
    );
    expect(text).toContain("Evidence URLs");
    expect(text).toContain("[A] https://courier.example.com/t");
    expect(text).toContain("[B] https://inspection.example.com/r");
  });

  it("handles statement versioning fields", () => {
    const text = buildCaseRecordText(baseState());
    expect(text).toContain("Statement A (v1)");
    expect(text).toContain("Statement B (v1)");
  });
});