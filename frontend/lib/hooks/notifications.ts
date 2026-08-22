/**
 * Pure state-diff helper for contract notifications.
 * Detects meaningful transitions between two polled state snapshots.
 */
import type { P2PState } from "../contracts/types";

export interface Notification {
  kind: "success" | "warning" | "info";
  title: string;
  description?: string;
}

interface Snapshot {
  status: string;
  dispute_requested: string;
  complete_a: string;
  complete_b: string;
  statement_a: string;
  statement_b: string;
  clarification_requested_at: string;
  clause_commits: string[];
}

export function snapshotOf(state: P2PState): Snapshot {
  return {
    status: state.status,
    dispute_requested: state.dispute_requested,
    complete_a: state.complete_a,
    complete_b: state.complete_b,
    statement_a: state.statement_a,
    statement_b: state.statement_b,
    clarification_requested_at: state.clarification_requested_at,
    clause_commits: state.clause_commits,
  };
}

export function diffState(
  prev: Snapshot,
  next: Snapshot,
  state: P2PState
): Notification[] {
  const out: Notification[] = [];

  if (prev.status !== next.status) {
    const map: Record<string, string> = {
      PARTIAL: "A commit was recorded — awaiting the counterparty.",
      ACTIVE:
        prev.status === "MISMATCHED"
          ? "Commitments now match — the contract is active."
          : "Both parties have committed — the contract is active.",
      DISPUTED: "A dispute has been opened and the terms are public.",
      MISMATCHED: "Commitments do not match — the parties disagree on terms.",
      RESOLVED: state.who_won
        ? `Dispute resolved in favor of Party ${state.who_won}.`
        : "The contract has been closed.",
    };
    const msg = map[next.status];
    if (msg) out.push({ kind: "success", title: msg });
  }

  if (prev.dispute_requested !== next.dispute_requested) {
    out.push({
      kind: "warning",
      title:
        next.dispute_requested === "1"
          ? "A dispute has been requested — private completion is locked."
          : "The dispute request was withdrawn — completion is unlocked.",
    });
  }

  if (
    (state.party_a && next.complete_a === "1" && prev.complete_a !== "1") ||
    (state.party_b && next.complete_b === "1" && prev.complete_b !== "1")
  ) {
    out.push({
      kind: "success",
      title: "Completion approved",
      description:
        "Your counterparty approved private close. Awaiting your approval if not yet given.",
    });
  }

  if (prev.statement_a !== next.statement_a && next.statement_a !== "") {
    out.push({ kind: "info", title: "Statement received", description: "Party A submitted a statement." });
  }
  if (prev.statement_b !== next.statement_b && next.statement_b !== "") {
    out.push({ kind: "info", title: "Statement received", description: "Party B submitted a statement." });
  }

  if (
    prev.clarification_requested_at !== next.clarification_requested_at &&
    next.clarification_requested_at !== ""
  ) {
    out.push({
      kind: "warning",
      title: "Clarification requested",
      description: "Your counterparty asked you to revise your statement.",
    });
  }

  if (
    next.clause_commits.length > 0 &&
    prev.clause_commits.length !== next.clause_commits.length
  ) {
    out.push({
      kind: "info",
      title: "Clause proofs ready",
      description: "Per-clause commitments recorded by both parties.",
    });
  }

  return out;
}

export function withinHours(deadline: string, hours: number): boolean {
  if (!deadline) return false;
  const s = deadline.trim().replace(/Z$/i, "");
  const t = Date.parse(`${s}Z`);
  if (isNaN(t)) return false;
  const remaining = t - Date.now();
  return remaining > 0 && remaining <= hours * 3600_000;
}