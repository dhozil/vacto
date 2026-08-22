"use client";

import { Users, ScrollText, Lock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { P2PState } from "@/lib/contracts/types";
import { AddressDisplay } from "./AddressDisplay";
import { Badge } from "./ui/badge";

interface Props {
  state: P2PState;
  myRole: "A" | "B" | null;
}

export function CaseOverview({ state, myRole }: Props) {
  const disputeLocked = state.dispute_requested === "1";
  const iApproved =
    (myRole === "A" && state.complete_a === "1") ||
    (myRole === "B" && state.complete_b === "1");
  const otherApproved =
    (myRole === "A" && state.complete_b === "1") ||
    (myRole === "B" && state.complete_a === "1");
  const consentProgress =
    myRole !== null ? (iApproved ? 1 : 0) + (otherApproved ? 1 : 0) : 0;

  const consent = {
    label:
      state.status === "RESOLVED"
        ? state.terms === "" && state.who_won === ""
          ? "Closed privately · both approved"
          : "Closed by AI arbitration"
        : state.status === "DISPUTED"
          ? "Dispute in progress"
          : disputeLocked
            ? "Completion locked (dispute requested)"
            : state.status === "ACTIVE"
              ? `${consentProgress}/2 approvals for private close`
              : "Awaiting commitments",
    tone:
      state.status === "RESOLVED"
        ? "bg-[var(--success)]/10 text-[var(--success)]"
        : state.status === "DISPUTED"
          ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
          : disputeLocked
            ? "bg-[var(--warning)]/10 text-[var(--warning)]"
            : "bg-primary/10 text-primary",
  } as const;

  return (
    <div className="brand-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Parties to the contract</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            consent.tone
          )}
        >
          {consent.label}
        </span>
      </div>

      <div className="space-y-2">
        {(["A", "B"] as const).map((side) => {
          const address = side === "A" ? state.party_a : state.party_b;
          const isMe = myRole === side;
          return (
            <div
              key={side}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                isMe
                  ? "border-primary/25 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 font-serif text-sm font-semibold text-primary">
                  {side}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Party {side}
                    {isMe && <span className="ml-1 text-primary">· you</span>}
                  </p>
                  <AddressDisplay address={address} maxLength={16} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Terms</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {state.terms ? "Revealed" : "Private · off-chain"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Dispute</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {state.status === "DISPUTED"
              ? "Open"
              : state.status === "RESOLVED"
                ? state.terms || state.who_won
                  ? "Resolved"
                  : "Closed"
                : disputeLocked
                  ? "Locked"
                  : "None"}
          </p>
        </div>
      </div>

      {state.status === "ACTIVE" && myRole && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-3 py-2 text-[11px] text-[var(--accent)]">
          <Scale className="h-3.5 w-3.5 shrink-0" />
          <p>
            Completion requires both approvals. Your vote:{" "}
            {iApproved ? "approved" : "not yet"} · counterparty:{" "}
            {otherApproved ? "approved" : "not yet"}.
          </p>
        </div>
      )}

      {!myRole && (
        <p className="text-[11px] text-muted-foreground">
          You are an observer — connect a party wallet to act on this contract.
        </p>
      )}

      {state.status === "PARTIAL" && (
        <Badge variant="warning" className="w-full justify-center">
          One party has committed. Waiting for the counterparty.
        </Badge>
      )}
    </div>
  );
}