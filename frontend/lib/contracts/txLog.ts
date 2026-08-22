/**
 * Local transaction audit trail.
 * Records every on-chain action performed from this browser, keyed by the
 * contract address, so users have a simple audit trail without requiring a
 * block explorer.
 */

import { safeJsonGet, safeJsonSet } from "../utils/safeStorage";

export interface TxRecord {
  hash: string;
  functionName: string;
  timestamp: string; // ISO-8601
  status: string;
  blockNumber?: number;
}

const KEY = (contract: string) => `p2p_tx_log_${contract.toLowerCase()}`;
const MAX_RECORDS = 50;

export function logTransaction(
  contractAddress: string,
  record: Omit<TxRecord, "timestamp">
): void {
  if (!contractAddress) return;
  const key = KEY(contractAddress);
  const history = safeJsonGet<TxRecord[]>(key, []);
  const entry: TxRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  safeJsonSet(key, [entry, ...history].slice(0, MAX_RECORDS));
}

export function getTransactionHistory(
  contractAddress: string
): TxRecord[] {
  return safeJsonGet<TxRecord[]>(KEY(contractAddress), []);
}

export function clearTransactionHistory(contractAddress: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KEY(contractAddress));
    }
  } catch {
    // ignore
  }
}

/** Human-friendly label for a contract function. */
export function functionLabel(fn: string): string {
  const map: Record<string, string> = {
    commit_terms: "Commit terms",
    reset_commits: "Reset commits",
    retract_commit: "Retract commit",
    request_completion: "Approve completion",
    retract_completion: "Withdraw completion approval",
    request_dispute: "Request dispute",
    withdraw_dispute_request: "Withdraw dispute request",
    open_dispute: "Reveal terms & open dispute",
    submit_statement: "Submit statement",
    request_clarification: "Request clarification",
    commit_clauses: "Commit clause digests",
    reveal_clause: "Prove clause",
    resolve_dispute: "Resolve dispute",
    force_completion: "Force completion",
    force_resolve_dispute: "Force resolve dispute",
  };
  return map[fn] ?? fn.replace(/_/g, " ");
}

export default {
  logTransaction,
  getTransactionHistory,
  clearTransactionHistory,
  functionLabel,
};