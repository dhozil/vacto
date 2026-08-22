"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  createInitialState,
  demoCommitTerms,
  demoRequestCompletion,
  demoRequestDispute,
  demoOpenDispute,
  demoSubmitStatement,
  demoRequestClarification,
  demoResolveDispute,
  demoReset,
  demoCommitClauses,
  demoRevealClause,
  demoRetractCommit,
  demoResetCommits,
  demoSubmitEvidence,
  demoCommitIdentity,
  demoRetractCompletion,
  demoWithdrawDisputeRequest,
  type DemoContractState,
} from "./demoState";
import type { P2PState } from "../contracts/types";
import { safeStorage, safeJsonGet, safeJsonSet } from "../utils/safeStorage";

const STORAGE_KEY = "p2p_demo_state";
const DEMO_PARTY_A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const DEMO_PARTY_B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

interface DemoContextType {
  isActive: boolean;
  state: DemoContractState | null;
  party: "A" | "B";
  switchParty: () => void;
  startDemo: () => void;
  endDemo: () => void;
  resetDemo: () => void;
  commitTerms: (commit: string) => void;
  requestCompletion: () => void;
  requestDispute: () => void;
  openDispute: (terms: string) => void;
  submitStatement: (statement: string) => void;
  requestClarification: () => void;
  resolveDispute: () => void;
  commitClauses: (clauseHashes: string[]) => void;
  revealClause: (index: number, clauseText: string) => void;
  retractCommit: () => void;
  resetCommits: () => void;
  submitEvidence: (urls: string[]) => void;
  commitIdentity: (termsSha256: string, saltSha256: string) => void;
  retractCompletion: () => void;
  withdrawDisputeRequest: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<DemoContractState | null>(null);
  const [party, setParty] = useState<"A" | "B">("A");

  useEffect(() => {
    const saved = safeJsonGet<DemoContractState | null>(STORAGE_KEY, null);
    if (saved) {
      setState(saved);
      setIsActive(true);
    }
  }, []);

  useEffect(() => {
    if (state) {
      safeJsonSet(STORAGE_KEY, state);
    }
  }, [state]);

  const startDemo = useCallback(() => {
    const initial = createInitialState(DEMO_PARTY_A, DEMO_PARTY_B);
    setState(initial);
    setParty("A");
    setIsActive(true);
  }, []);

  const endDemo = useCallback(() => {
    setState(null);
    setIsActive(false);
    safeStorage.remove(STORAGE_KEY);
  }, []);

  const resetDemo = useCallback(() => {
    const initial = createInitialState(DEMO_PARTY_A, DEMO_PARTY_B);
    setState(initial);
    setParty("A");
  }, []);

  const switchParty = useCallback(() => {
    setParty((p) => (p === "A" ? "B" : "A"));
  }, []);

  const sender = party === "A" ? DEMO_PARTY_A : DEMO_PARTY_B;

  const commitTerms = useCallback(
    (commit: string) => {
      if (!state) return;
      setState(demoCommitTerms(state, sender, commit));
    },
    [state, sender]
  );

  const requestCompletion = useCallback(() => {
    if (!state) return;
    setState(demoRequestCompletion(state, sender));
  }, [state, sender]);

  const requestDispute = useCallback(() => {
    if (!state) return;
    setState(demoRequestDispute(state, sender));
  }, [state, sender]);

  const openDispute = useCallback(
    (terms: string) => {
      if (!state) return;
      setState(demoOpenDispute(state, sender, terms));
    },
    [state, sender]
  );

  const submitStatement = useCallback(
    (statement: string) => {
      if (!state) return;
      setState(demoSubmitStatement(state, sender, statement));
    },
    [state, sender]
  );

  const requestClarification = useCallback(() => {
    if (!state) return;
    setState(demoRequestClarification(state, sender));
  }, [state, sender]);

  const resolveDispute = useCallback(() => {
    if (!state) return;
    setState(demoResolveDispute(state));
  }, [state]);

  const retractCommit = useCallback(() => {
    if (!state) return;
    setState(demoRetractCommit(state, sender));
  }, [state, sender]);

  const resetCommits = useCallback(() => {
    if (!state) return;
    setState(demoResetCommits(state, sender));
  }, [state, sender]);

  const submitEvidence = useCallback(
    (urls: string[]) => {
      if (!state) return;
      setState(demoSubmitEvidence(state, sender, urls));
    },
    [state, sender]
  );

  const commitIdentity = useCallback(
    (termsSha256: string, saltSha256: string) => {
      if (!state) return;
      setState(demoCommitIdentity(state, sender, termsSha256, saltSha256));
    },
    [state, sender]
  );

  const retractCompletion = useCallback(() => {
    if (!state) return;
    setState(demoRetractCompletion(state, sender));
  }, [state, sender]);

  const withdrawDisputeRequest = useCallback(() => {
    if (!state) return;
    setState(demoWithdrawDisputeRequest(state, sender));
  }, [state, sender]);

  const commitClauses = useCallback(
    (clauseHashes: string[]) => {
      if (!state) return;
      setState(demoCommitClauses(state, sender, clauseHashes));
    },
    [state, sender]
  );

  const revealClause = useCallback(
    (index: number, clauseText: string) => {
      if (!state) return;
      setState(demoRevealClause(state, sender, index, clauseText));
    },
    [state, sender]
  );

  return (
    <DemoContext.Provider
      value={{
        isActive,
        state,
        party,
        switchParty,
        startDemo,
        endDemo,
        resetDemo,
        commitTerms,
        requestCompletion,
        requestDispute,
        openDispute,
        submitStatement,
        requestClarification,
        resolveDispute,
        commitClauses,
        revealClause,
        retractCommit,
        resetCommits,
        submitEvidence,
        commitIdentity,
        retractCompletion,
        withdrawDisputeRequest,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

/** Convert demo state to P2PState for use by existing components */
export function demoToP2PState(state: DemoContractState): P2PState {
  return {
    status: state.status,
    party_a: state.party_a,
    party_b: state.party_b,
    commit_a: state.commit_a,
    commit_b: state.commit_b,
    terms: state.terms,
    revealed_by: state.revealed_by,
    terms_sha256: state.terms_sha256,
    salt_sha256: state.salt_sha256,
    identity_a: "0x",
    identity_b: "",
    statement_a: state.statement_a,
    statement_b: state.statement_b,
    who_won: state.who_won,
    verdict: state.verdict,
    reasoning: state.reasoning,
    complete_a: state.complete_a,
    complete_b: state.complete_b,
    dispute_requested: state.dispute_requested,
    dispute_requested_by: state.dispute_requested_by,
    reset_a: state.reset_a,
    reset_b: state.reset_b,
    clauses_sent_a: state.clauses_sent_a,
    clauses_sent_b: state.clauses_sent_b,
    clause_commits: state.clause_commits,
    revealed_clauses: state.revealed_clauses,
    created_at: state.created_at,
    commit_a_at: state.commit_a_at,
    commit_b_at: state.commit_b_at,
    completion_requested_at: state.completion_requested_at,
    completion_requested_by: state.completion_requested_by,
    dispute_requested_at: state.dispute_requested_at,
    open_dispute_deadline: state.open_dispute_deadline,
    dispute_opened_at: state.dispute_opened_at,
    resolve_deadline: state.resolve_deadline,
    resolved_at: state.resolved_at,
    statement_a_updated_at: state.statement_a_updated_at,
    statement_b_updated_at: state.statement_b_updated_at,
    statement_a_version: state.statement_a_version,
    statement_b_version: state.statement_b_version,
    clarification_requested_at: state.clarification_requested_at,
    clarification_requested_by: state.clarification_requested_by,
    resolve_attempts: state.resolve_attempts,
    evidence_a: state.evidence_a,
    evidence_b: state.evidence_b,
    evidence_reviewed_a: state.evidence_reviewed_a,
    evidence_reviewed_b: state.evidence_reviewed_b,
    evidence_digests: state.evidence_digests ?? {},
  };
}

export { DEMO_PARTY_A, DEMO_PARTY_B };
