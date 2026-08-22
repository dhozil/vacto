/**
 * In-memory state machine mirroring the PrivateP2PContract.
 * Used for demo mode without a real network.
 */
import type { P2PStatus } from "../contracts/types";

export interface DemoContractState {
  status: P2PStatus;
  party_a: string;
  party_b: string;
  commit_a: string;
  commit_b: string;
  terms: string;
  revealed_by: string;
  terms_sha256: string;
  salt_sha256: string;
  ack_a: string;
  ack_b: string;
  ack_a_at: string;
  ack_b_at: string;
  statement_a: string;
  statement_b: string;
  who_won: string;
  verdict: string;
  reasoning: string;
  complete_a: string;
  complete_b: string;
  dispute_requested: string;
  dispute_requested_by: string;
  reset_a: string;
  reset_b: string;
  clauses_sent_a: string;
  clauses_sent_b: string;
  clause_commits: string[];
  revealed_clauses: Record<string, string>;
  evidence_a: string[];
  evidence_b: string[];
  evidence_reviewed_a: string;
  evidence_reviewed_b: string;
  evidence_digests: Record<string, string>;
  created_at: string;
  commit_a_at: string;
  commit_b_at: string;
  completion_requested_at: string;
  completion_requested_by: string;
  dispute_requested_at: string;
  open_dispute_deadline: string;
  dispute_opened_at: string;
  resolve_deadline: string;
  resolved_at: string;
  statement_a_updated_at: string;
  statement_b_updated_at: string;
  statement_a_version: string;
  statement_b_version: string;
  clarification_requested_at: string;
  clarification_requested_by: string;
  resolve_attempts: string;
}

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

export function createInitialState(partyA: string, partyB: string): DemoContractState {
  return {
    status: "CREATED",
    party_a: partyA,
    party_b: partyB,
    commit_a: "",
    commit_b: "",
    terms: "",
    revealed_by: "",
    terms_sha256: "",
    salt_sha256: "",
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
    created_at: now(),
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
  };
}

function isParty(state: DemoContractState, sender: string): boolean {
  return sender === state.party_a || sender === state.party_b;
}

export function demoCommitTerms(
  state: DemoContractState,
  sender: string,
  commit: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can commit terms");
  if (state.status !== "CREATED" && state.status !== "PARTIAL") {
    throw new Error("Cannot commit in current status");
  }

  const next = { ...state };
  if (sender === state.party_a) {
    next.commit_a = commit;
    next.commit_a_at = now();
  } else {
    next.commit_b = commit;
    next.commit_b_at = now();
  }

  if (next.commit_a && next.commit_b) {
    if (next.commit_a !== next.commit_b) {
      next.status = "MISMATCHED";
    } else {
      next.status = "ACTIVE";
    }
  } else {
    next.status = "PARTIAL";
  }

  return next;
}

export function demoRequestCompletion(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can approve");
  if (state.status !== "ACTIVE") throw new Error("Contract must be ACTIVE");

  const next = { ...state };
  if (sender === state.party_a) {
    next.complete_a = "1";
  } else {
    next.complete_b = "1";
  }
  next.completion_requested_at = now();
  next.completion_requested_by = sender;

  if (next.complete_a === "1" && next.complete_b === "1") {
    next.status = "RESOLVED";
    next.resolved_at = now();
    next.verdict =
      "DISPOSITION. This matter is closed by mutual agreement of the parties. In accordance with the private-completion procedure, both parties have certified performance, and the terms of this agreement shall remain confidential and never revealed on-chain.";
    next.reasoning =
      "Both signatories approved private closure; no dispute was raised within the response window.";
  }

  return next;
}

export function demoRequestDispute(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can request dispute");
  if (state.status !== "ACTIVE") throw new Error("Contract must be ACTIVE");

  return {
    ...state,
    dispute_requested: "1",
    dispute_requested_by: sender,
    dispute_requested_at: now(),
    open_dispute_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
}

/** Withdraw the sender's own completion approval (mirrors retract_completion). */
export function demoRetractCompletion(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can retract completion");
  if (state.status !== "ACTIVE") throw new Error("Cannot retract completion when not ACTIVE");
  const next = { ...state };
  if (sender === state.party_a) next.complete_a = "0";
  else next.complete_b = "0";
  return next;
}

/** Withdraw the sender's own dispute request (mirrors withdraw_dispute_request). */
export function demoWithdrawDisputeRequest(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can withdraw a dispute");
  if (state.status !== "ACTIVE" || state.dispute_requested !== "1") {
    throw new Error("No dispute request to withdraw");
  }
  if (state.dispute_requested_by !== sender) {
    throw new Error("Only the requester can withdraw the dispute request");
  }
  return {
    ...state,
    dispute_requested: "0",
    dispute_requested_by: "",
    dispute_requested_at: "",
    open_dispute_deadline: "",
  };
}

export function demoOpenDispute(
  state: DemoContractState,
  sender: string,
  terms: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can open dispute");
  if (state.status !== "ACTIVE" && state.status !== "PARTIAL") {
    throw new Error("Cannot open dispute in current status");
  }

  return {
    ...state,
    status: "DISPUTED",
    terms,
    revealed_by: sender,
    dispute_opened_at: now(),
    resolve_deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
}

export function demoSubmitStatement(
  state: DemoContractState,
  sender: string,
  statement: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can submit statements");
  if (state.status !== "DISPUTED") throw new Error("No active dispute");

  const next = { ...state };
  if (sender === state.party_a) {
    next.statement_a = statement;
    next.statement_a_updated_at = now();
    next.statement_a_version = String(Number(next.statement_a_version) + 1);
  } else {
    next.statement_b = statement;
    next.statement_b_updated_at = now();
    next.statement_b_version = String(Number(next.statement_b_version) + 1);
  }

  return next;
}

export function demoRequestClarification(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can request clarification");
  if (state.status !== "DISPUTED") throw new Error("No active dispute");

  return {
    ...state,
    clarification_requested_at: now(),
    clarification_requested_by: sender,
  };
}

export function demoResolveDispute(state: DemoContractState): DemoContractState {
  if (state.status !== "DISPUTED") throw new Error("No dispute to resolve");
  if (!state.statement_a || !state.statement_b) {
    throw new Error("Both parties must submit statements");
  }
  if (state.evidence_reviewed_a !== "1" || state.evidence_reviewed_b !== "1") {
    throw new Error("Both parties must complete their evidence input");
  }

  const verdicts = ["A", "B", "DRAW"] as const;
  const winner = verdicts[Math.floor(Math.random() * 3)];

  return {
    ...state,
    status: "RESOLVED",
    who_won: winner,
    verdict:
      winner === "DRAW"
        ? "DECISION. The tribunal finds that both parties have presented credible positions. Having weighed the revealed terms against the statements of the parties, the matter is resolved as a draw, and neither party is adjudged to have breached the agreement."
        : `DECISION. The tribunal finds in favor of Party ${winner}. Having weighed the revealed terms against the statements of the parties, the tribunal concludes that Party ${winner} has discharged its obligations under the agreement and that the counterparty has not established a breach.`,
    reasoning:
      winner === "DRAW"
        ? "ANALYSIS. Step 1 — Facts evident from the revealed terms were identified. Step 2 — Each party's claim was summarized from its statement. Step 3 — Claims were compared against the revealed terms. Step 4 — No claim was found to be clearly supported over the other; the terms are ambiguous as to the disputed obligation, so the tribunal rules DRAW."
        : `ANALYSIS. Step 1 — Facts evident from the revealed terms were identified. Step 2 — Each party's claim was summarized from its statement. Step 3 — Claims were compared against the revealed terms; unsupported assertions were disregarded. Step 4 — Party ${winner}'s position is directly supported by the terms, while the counterparty's claim lacks support, so the tribunal rules for Party ${winner}.`,
    resolved_at: now(),
    resolve_attempts: String(Number(state.resolve_attempts) + 1),
  };
}

export function demoReset(state: DemoContractState): DemoContractState {
  return createInitialState(state.party_a, state.party_b);
}

/** Withdraw ONLY the sender's own commitment (mirrors retract_commit). */
export function demoRetractCommit(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can retract a commit");
  if (state.status !== "PARTIAL" && state.status !== "MISMATCHED") {
    throw new Error(`Cannot retract a commit when status is ${state.status}`);
  }

  const next = { ...state };
  if (sender === state.party_a) {
    if (!next.commit_a) throw new Error("Party A has no commitment to retract");
    next.commit_a = "";
    next.commit_a_at = "";
  } else {
    if (!next.commit_b) throw new Error("Party B has no commitment to retract");
    next.commit_b = "";
    next.commit_b_at = "";
  }

  next.status =
    next.commit_a === "" && next.commit_b === "" ? "CREATED" : "PARTIAL";
  return next;
}

/** Two-step full reset — both parties must consent (mirrors reset_commits). */
export function demoResetCommits(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can reset commits");

  const next = { ...state };
  if (sender === state.party_a) next.reset_a = "1";
  else next.reset_b = "1";

  if (next.reset_a === "1" && next.reset_b === "1") {
    const fresh = createInitialState(state.party_a, state.party_b);
    fresh.created_at = state.created_at;
    return fresh;
  }
  return next;
}

/** One-time, irreversible acknowledgment (mirrors acknowledge_party). */
export function demoAcknowledgeParty(
  state: DemoContractState,
  sender: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can acknowledge");
  if (state.status !== "CREATED" && state.status !== "PARTIAL" && state.status !== "ACTIVE") {
    throw new Error("Cannot acknowledge in current status");
  }
  const next = { ...state };
  if (sender === state.party_a) {
    if (next.ack_a === "1") throw new Error("Party A has already acknowledged");
    next.ack_a = "1";
    next.ack_a_at = now();
  } else {
    if (next.ack_b === "1") throw new Error("Party B has already acknowledged");
    next.ack_b = "1";
    next.ack_b_at = now();
  }
  return next;
}

/** Record/replace the sender's evidence URLs (mirrors submit_evidence). */
export function demoSubmitEvidence(
  state: DemoContractState,
  sender: string,
  urls: string[]
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only the two parties can submit evidence");
  if (state.status !== "DISPUTED") throw new Error("Evidence requires an active dispute");
  if (urls.length > 3) throw new Error("At most 3 evidence URLs are allowed");

  const next = { ...state };
  if (sender === state.party_a) {
    next.evidence_a = urls.slice(0, 3);
    next.evidence_reviewed_a = "1";
  } else {
    next.evidence_b = urls.slice(0, 3);
    next.evidence_reviewed_b = "1";
  }
  return next;
}

export function demoCommitClauses(
  state: DemoContractState,
  sender: string,
  clauseHashes: string[]
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can commit clause digests");
  if (state.status !== "ACTIVE") throw new Error("Clause commitments require ACTIVE status");
  if (!clauseHashes.length) throw new Error("Clause digest list must not be empty");

  const next = { ...state };
  if (sender === state.party_a) {
    next.clauses_sent_a = "1";
  } else {
    next.clauses_sent_b = "1";
  }

  // Only make clause digests "active" once BOTH parties have recorded.
  next.clause_commits =
    next.clauses_sent_a === "1" && next.clauses_sent_b === "1" ? clauseHashes : [];

  return next;
}

/** Record the parties' public identity commitments (mirrors commit_identity). */
export function demoCommitIdentity(
  state: DemoContractState,
  sender: string,
  termsSha256: string,
  saltSha256: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can commit identity");
  if (state.status !== "CREATED" && state.status !== "PARTIAL" && state.status !== "ACTIVE") {
    throw new Error("Cannot commit identity in current status");
  }
  const next = { ...state };
  if (next.terms_sha256 === "") {
    next.terms_sha256 = termsSha256;
    next.salt_sha256 = saltSha256;
  } else if (next.terms_sha256 !== termsSha256 || next.salt_sha256 !== saltSha256) {
    throw new Error("Identity commitments do not match between parties");
  }
  return next;
}

export function demoRevealClause(
  state: DemoContractState,
  sender: string,
  index: number,
  clauseText: string
): DemoContractState {
  if (!isParty(state, sender)) throw new Error("Only parties can reveal a clause");
  if (state.status !== "ACTIVE" && state.status !== "DISPUTED") {
    throw new Error(`Cannot reveal a clause when status is ${state.status}`);
  }
  if (index < 0 || index >= state.clause_commits.length) {
    throw new Error("Clause index out of range");
  }

  const next = { ...state };
  next.revealed_clauses = {
    ...next.revealed_clauses,
    [String(index)]: clauseText,
  };

  return next;
}
