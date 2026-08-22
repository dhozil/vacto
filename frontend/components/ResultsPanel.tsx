"use client";

import { Trophy, Lock, FileWarning, ScrollText, Download } from "lucide-react";
import type { P2PState } from "@/lib/contracts/types";
import { exportCaseRecord } from "@/lib/contracts/caseExport";
import { Button } from "./ui/button";

export function ResultsPanel({ state }: { state: P2PState }) {
  if (state.status !== "RESOLVED") return null;

  const wasPrivateCompletion = state.terms === "" && state.who_won === "";

  return (
    <section className="animate-rise">
      <div
        className={
          "rounded-xl border p-6 sm:p-8 space-y-5 shadow-[0_1px_2px_0_rgb(24_20_12/0.04),0_16px_40px_-20px_rgb(24_20_12/0.14)] " +
          (wasPrivateCompletion
            ? "border-[var(--success)]/30 bg-gradient-to-br from-white to-[var(--success)]/[0.06]"
            : "border-[var(--accent)]/30 bg-gradient-to-br from-white to-[var(--accent)]/[0.07]")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div
              className={
                "grid h-11 w-11 place-items-center rounded-full " +
                (wasPrivateCompletion
                  ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : "bg-[var(--accent)]/10 text-[var(--accent)]")
              }
            >
              {wasPrivateCompletion ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Trophy className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="section-label">
                {wasPrivateCompletion ? "Final disposition" : "Arbitration verdict"}
              </p>
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
                {wasPrivateCompletion
                  ? "Matter closed privately"
                  : `Decided in favor of Party ${state.who_won}`}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " +
                (wasPrivateCompletion
                  ? "bg-[var(--success)]/10 text-[var(--success)]"
                  : "bg-[var(--accent)]/10 text-[var(--accent)]")
              }
            >
              <ScrollText className="h-3.5 w-3.5" />
              {wasPrivateCompletion ? "Confidential · sealed" : "Public record"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCaseRecord(state)}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export case record
            </Button>
          </div>
        </div>

        {wasPrivateCompletion ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground">
              {state.verdict}
            </p>
            <p className="text-sm text-[var(--success)]">
              The terms were never stored on-chain — full confidentiality was
              preserved for both parties.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <p className="section-label">Winner</p>
              <div className="space-y-1.5">
                <div
                  className={
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-serif text-lg font-semibold " +
                    (state.who_won === "A" || state.who_won === "B"
                      ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-border bg-muted/50 text-foreground")
                  }
                >
                  <Trophy className="h-4 w-4" />
                  {state.who_won === "A" || state.who_won === "B"
                    ? `Party ${state.who_won}`
                    : state.who_won}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Reached by consensus across the GenLayer validator network.
              </p>
            </div>

            <div className="space-y-4">
              {state.verdict && (
                <div>
                  <p className="section-label mb-1.5">Verdict</p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {state.verdict}
                  </p>
                </div>
              )}
              {state.reasoning && (
                <div>
                  <p className="section-label mb-1.5">Reasoning</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {state.reasoning}
                  </p>
                </div>
              )}
              {state.terms && (
                <div>
                  <p className="section-label mb-1.5 flex items-center gap-1.5">
                    <FileWarning className="h-3.5 w-3.5" />
                    Revealed terms · now public record
                  </p>
                  <blockquote className="rounded-lg border border-border bg-muted/50 px-4 py-3 font-serif text-sm italic leading-relaxed text-foreground">
                    {state.terms}
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}