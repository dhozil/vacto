/**
 * Case record export — generates a downloadable document from a contract state.
 * Produces both a human-readable .txt record and a machine-readable .json.
 */
import type { P2PState } from "../contracts/types";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(/Z$/, ""));
  return isNaN(d.getTime()) ? iso : d.toISOString();
}

function address(a: string): string {
  if (!a) return "—";
  return a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;
}

export function buildCaseRecordText(state: P2PState): string {
  const L: string[] = [];
  L.push("================================================================");
  L.push("  VACTO — CASE RECORD");
  L.push("  Generated: " + new Date().toISOString());
  L.push("================================================================");
  L.push("");
  L.push(`Status:           ${state.status}`);
  L.push(`Party A:          ${address(state.party_a)}`);
  L.push(`Party B:          ${address(state.party_b)}`);
  L.push(`Created:          ${formatDate(state.created_at)}`);
  L.push("");
  L.push("--- Confidentiality -----------------------------------------");
  L.push(
    state.terms
      ? "Terms were REVEALED on-chain (a dispute was opened)."
      : "Terms were NEVER revealed — the contract stayed private."
  );
  if (state.terms) {
    L.push("");
    L.push("Revealed terms:");
    L.push(state.terms);
    L.push(`Revealed by:      ${address(state.revealed_by)}`);
  }
  L.push("");
  L.push("--- Commitments ----------------------------------------------");
  L.push(`Commit A:         ${state.commit_a || "—"}`);
  L.push(`Commit B:         ${state.commit_b || "—"}`);
  L.push("Commit digests are HMAC-SHA256 keyed by a secret salt.");
  L.push("");
  if (state.clause_commits.length > 0) {
    L.push("Per-clause commitments recorded: " + state.clause_commits.length);
    const revealed = Object.entries(state.revealed_clauses ?? {});
    if (revealed.length > 0) {
      L.push("Revealed clauses:");
      for (const [idx, text] of revealed) {
        L.push(`  [${idx}] ${text}`);
      }
    }
    L.push("");
  }
  L.push("--- Dispute -------------------------------------------------");
  if (state.statement_a || state.statement_b) {
    L.push(`Statement A (v${state.statement_a_version}): ${
      state.statement_a ? state.statement_a : "—"
    }`);
    L.push(`Statement B (v${state.statement_b_version}): ${
      state.statement_b ? state.statement_b : "—"
    }`);
    L.push("");
  }
  if ((state.evidence_a ?? []).length || (state.evidence_b ?? []).length) {
    L.push("Evidence URLs (fetched on-chain during arbitration):");
    for (const u of state.evidence_a ?? []) L.push(`  [A] ${u}`);
    for (const u of state.evidence_b ?? []) L.push(`  [B] ${u}`);
    L.push("");
  }
  if (state.who_won || state.verdict) {
    L.push(`Ruling:  Party ${state.who_won || "—"}`);
    L.push(`Verdict: ${state.verdict}`);
    L.push("");
    L.push("Reasoning:");
    L.push(state.reasoning || "—");
    L.push(`Resolved: ${formatDate(state.resolved_at)}`);
    L.push("");
  }
  L.push("--- Timeline ------------------------------------------------");
  L.push(`Commit A:         ${formatDate(state.commit_a_at)}`);
  L.push(`Commit B:         ${formatDate(state.commit_b_at)}`);
  L.push(`Completion req.:  ${formatDate(state.completion_requested_at)}`);
  L.push(`Dispute opened:   ${formatDate(state.dispute_opened_at)}`);
  L.push(`Resolution deadl:  ${formatDate(state.resolve_deadline)}`);
  L.push(`Resolved:         ${formatDate(state.resolved_at)}`);
  L.push("");
  L.push("--- Disclaimer ----------------------------------------------");
  L.push("This record is exported locally from application state.");
  L.push("For the authoritative on-chain record, inspect the contract");
  L.push("address on the GenLayer explorer.");
  L.push("");
  L.push("================================================================");
  return L.join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain"
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(
  filename: string,
  data: Record<string, unknown>
): void {
  downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json");
}

export function exportCaseRecord(state: P2PState): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const base = `p2p-case-${state.party_a?.slice(0, 6)}-${stamp}`;
  downloadTextFile(`${base}.txt`, buildCaseRecordText(state));
  downloadJsonFile(`${base}.json`, { ...state });
}

export default { buildCaseRecordText, exportCaseRecord, downloadTextFile, downloadJsonFile };