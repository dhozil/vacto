import { describe, it, expect } from "vitest";
import {
  createInitialState,
  demoCommitTerms,
  demoRequestCompletion,
  demoRequestDispute,
  demoOpenDispute,
  demoSubmitStatement,
  demoSubmitEvidence,
  demoResolveDispute,
} from "../lib/demo/demoState";

const A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const HASH = "ab".repeat(32);

describe("demo lifecycle — private close", () => {
  it("walks CREATED → PARTIAL → ACTIVE → RESOLVED (mutual completion)", () => {
    let s = createInitialState(A, B);
    expect(s.status).toBe("CREATED");

    s = demoCommitTerms(s, A, HASH);
    expect(s.status).toBe("PARTIAL");

    s = demoCommitTerms(s, B, HASH);
    expect(s.status).toBe("ACTIVE");
    expect(s.commit_a).toBe(HASH);
    expect(s.commit_b).toBe(HASH);

    s = demoRequestCompletion(s, A);
    expect(s.status).toBe("ACTIVE");
    expect(s.complete_a).toBe("1");

    s = demoRequestCompletion(s, B);
    expect(s.status).toBe("RESOLVED");
    expect(s.complete_b).toBe("1");
    expect(s.verdict).toContain("mutual agreement");
  });
});

describe("demo lifecycle — dispute to resolution", () => {
  it("walks ACTIVE → DISPUTED → RESOLVED via AI arbitration", () => {
    let s = createInitialState(A, B);
    s = demoCommitTerms(demoCommitTerms(s, A, HASH), B, HASH);
    expect(s.status).toBe("ACTIVE");

    s = demoRequestDispute(s, A);
    expect(s.dispute_requested).toBe("1");

    const terms = "Deliver 100 widgets by March 1st for 50 GEN";
    s = demoOpenDispute(s, A, terms);
    expect(s.status).toBe("DISPUTED");
    expect(s.terms).toBe(terms);

    s = demoSubmitStatement(s, A, "I delivered on time.");
    s = demoSubmitStatement(s, B, "The widgets were defective.");
    expect(s.statement_a_version).toBe("1");
    expect(s.statement_b_version).toBe("1");

    s = demoSubmitEvidence(s, A, []);
    s = demoSubmitEvidence(s, B, ["https://example.com/proof"]);
    expect(s.evidence_reviewed_a).toBe("1");
    expect(s.evidence_reviewed_b).toBe("1");

    s = demoResolveDispute(s);
    expect(s.status).toBe("RESOLVED");
    expect(["A", "B", "DRAW"]).toContain(s.who_won);
    expect(s.resolve_attempts).toBe("1");
  });

  it("blocks resolution until both parties submit", () => {
    let s = createInitialState(A, B);
    s = demoCommitTerms(demoCommitTerms(s, A, HASH), B, HASH);
    s = demoOpenDispute(s, A, "terms");

    s = demoSubmitStatement(s, A, "only A");
    expect(() => demoResolveDispute(s)).toThrow("Both parties must submit statements");
  });
});