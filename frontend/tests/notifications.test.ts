import { describe, it, expect, vi, afterEach } from "vitest";
import { diffState, snapshotOf, withinHours } from "../lib/hooks/notifications";
import type { P2PState } from "../lib/contracts/types";

function state(overrides: Partial<P2PState> = {}): P2PState {
  return {
    status: "ACTIVE",
    party_a: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    party_b: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    commit_a: "",
    commit_b: "",
    terms: "",
    revealed_by: "",
    terms_sha256: "",
    salt_sha256: "",
    identity_a: "",
    identity_b: "",
    ack_a: "0",
    ack_b: "0",
    ack_a_at: "",
    ack_b_at: "",
    statement_a: "",
    statement_b: "",
    who_won: "",
    verdict: "",
    reasoning: "",
    complete_a: "0",
    complete_b: "0",
    dispute_requested: "0",
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
    commit_a_at: "",
    commit_b_at: "",
    completion_requested_at: "",
    completion_requested_by: "",
    dispute_requested_at: "",
    open_dispute_deadline: "",
    dispute_opened_at: "",
    resolve_deadline: "",
    resolved_at: "",
    statement_a_updated_at: "",
    statement_b_updated_at: "",
    statement_a_version: "0",
    statement_b_version: "0",
    clarification_requested_at: "",
    clarification_requested_by: "",
    resolve_attempts: "0",
    ...overrides,
  };
}

describe("diffState", () => {
  it("detects a status transition to ACTIVE", () => {
    const prev = snapshotOf(state());
    const next = snapshotOf(state());
    prev.status = "PARTIAL";
    next.status = "ACTIVE";
    const notes = diffState(prev, next, state());
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toContain("active");
  });

  it("detects a dispute request", () => {
    const prev = snapshotOf(state());
    const next = snapshotOf(state());
    prev.dispute_requested = "0";
    next.dispute_requested = "1";
    const notes = diffState(prev, next, state());
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("warning");
    expect(notes[0].title).toContain("locked");
  });

  it("notifies when the counterparty approves completion", () => {
    const st = state({ party_a: "0xAAAA", party_b: "0xBBBB" });
    const prev = snapshotOf(st);
    prev.complete_b = "0";
    st.complete_b = "1";
    const notes = diffState(prev, snapshotOf(st), st);
    expect(notes.some((n) => n.title === "Completion approved")).toBe(true);
  });

  it("notifies on a new statement", () => {
    const prev = snapshotOf(state());
    const st = state({ statement_b: "I delivered." });
    const notes = diffState(prev, snapshotOf(st), st);
    expect(notes.some((n) => n.title === "Statement received")).toBe(true);
    expect(notes[0].description).toContain("Party B");
  });

  it("notifies when clarification is requested", () => {
    const prev = snapshotOf(state());
    const st = state({ clarification_requested_at: "2026-01-05T00:00:00Z" });
    const notes = diffState(prev, snapshotOf(st), st);
    expect(notes.some((n) => n.title === "Clarification requested")).toBe(true);
  });

  it("notifies once when clause commits first appear", () => {
    const prev = snapshotOf(state());
    const st = state({ clause_commits: ["aa", "bb"] });
    const notes = diffState(prev, snapshotOf(st), st);
    expect(notes.some((n) => n.title === "Clause proofs ready")).toBe(true);
  });

  it("produces no notifications when nothing changed", () => {
    const st = state();
    const snap = snapshotOf(st);
    expect(diffState(snap, snap, st)).toHaveLength(0);
  });
});

describe("withinHours", () => {
  afterEach(() => vi.useRealTimers());

  it("reports true when the deadline is within the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const near = "2026-01-01T12:00:00Z"; // 12h out
    expect(withinHours(near, 24)).toBe(true);
  });

  it("reports false when the deadline is too far away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const far = "2026-01-10T00:00:00Z";
    expect(withinHours(far, 24)).toBe(false);
  });

  it("reports false for empty or past deadlines", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(withinHours("", 24)).toBe(false);
    expect(withinHours("2025-12-30T00:00:00Z", 24)).toBe(false);
  });
});