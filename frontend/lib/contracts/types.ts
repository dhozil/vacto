/**
 * TypeScript types mirroring the PrivateP2PContract storage.
 */

export type P2PStatus =
  | "CREATED"
  | "PARTIAL"
  | "ACTIVE"
  | "MISMATCHED"
  | "DISPUTED"
  | "RESOLVED";

export interface P2PState {
  status: P2PStatus;
  party_a: string;
  party_b: string;
  commit_a: string;
  commit_b: string;
  terms: string;
  revealed_by: string;
  terms_sha256: string;
  salt_sha256: string;
  identity_a: string;
  identity_b: string;
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
  evidence_a: string[];
  evidence_b: string[];
  evidence_reviewed_a: string;
  evidence_reviewed_b: string;
  evidence_digests: Record<string, string>;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}

export interface CommitRequest {
  terms: string;
  salt: string;
  commit: string;
}