"use client";

import { Lock, Unlock, KeyRound, Stamp, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { P2PState } from "@/lib/contracts/types";

export function PrivacyPanel({ state }: { state: P2PState }) {
  const privateStatus = ["CREATED", "PARTIAL", "ACTIVE"].includes(state.status);
  const revealed = state.terms !== "";
  const commits = [state.commit_a, state.commit_b].filter(Boolean);

  const rows = [
    {
      icon: revealed ? Unlock : Lock,
      label: "Agreed terms",
      value: revealed ? "Public — revealed on dispute" : "Private — never stored on-chain",
      tone: revealed ? "text-[var(--destructive)]" : "text-[var(--success)]",
    },
    {
      icon: KeyRound,
      label: "Commitment digests",
      value:
        commits.length === 2
          ? "2 committed · sha-256"
          : commits.length === 1
            ? "1 committed · sha-256"
            : "None committed yet",
      tone: "text-primary",
    },
    {
      icon: ScrollText,
      label: "Party statements",
      value:
        state.statement_a && state.statement_b
          ? "Both on record"
          : state.statement_a || state.statement_b
            ? "One on record"
            : "Not required yet",
      tone: "text-muted-foreground",
    },
  ];

  return (
    <div className="brand-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {privateStatus ? (
            <Stamp className="h-4 w-4 text-[var(--success)]" />
          ) : (
            <Unlock className="h-4 w-4 text-[var(--destructive)]" />
          )}
          <h3 className="text-sm font-semibold">Confidentiality</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            privateStatus
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
          )}
        >
          {privateStatus ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          {privateStatus ? "Private" : "Revealed"}
        </span>
      </div>

      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2 text-[13px] text-foreground/80">
              <row.icon className={cn("h-3.5 w-3.5 shrink-0", row.tone)} />
              {row.label}
            </span>
            <span className={cn("text-right text-xs font-medium", row.tone)}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>

      <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Only the sha-256 commitments live on-chain while the parties cooperate.
        Nothing else — including the terms and salts — is ever written until a
        dispute forces the reveal.
      </p>
    </div>
  );
}