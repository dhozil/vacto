"use client";

import { Check, CircleDashed, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { P2PStatus } from "@/lib/contracts/types";

interface Step {
  key: P2PStatus;
  label: string;
  caption: string;
}

const STEPS: Step[] = [
  { key: "CREATED", label: "Created", caption: "Contract deployed" },
  { key: "PARTIAL", label: "Committed", caption: "Awaiting counterparty" },
  { key: "ACTIVE", label: "Active", caption: "Both committed · private" },
  { key: "DISPUTED", label: "Disputed", caption: "Terms revealed on-chain" },
  { key: "RESOLVED", label: "Resolved", caption: "Closed or arbitrated" },
];

const INDEX: Record<string, number> = {
  CREATED: 0,
  PARTIAL: 1,
  ACTIVE: 2,
  DISPUTED: 3,
  RESOLVED: 4,
};

export function ContractTimeline({
  status,
  className,
}: {
  status: P2PStatus;
  className?: string;
}) {
  const current = INDEX[status] ?? 0;
  const mismatched = status === "MISMATCHED";

  return (
    <ol className={cn("space-y-0", className)}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const isLast = i === STEPS.length - 1;

        return (
          <li key={step.key} className="relative flex gap-3 pb-0">
            {/* connector */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[13px] top-7 h-[calc(100%-8px)] w-px",
                  i < current ? "bg-[var(--primary)]/35" : "bg-border"
                )}
                aria-hidden
              />
            )}

            {/* node */}
            <span
              className={cn(
                "relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors",
                done && "border-transparent bg-[var(--primary)] text-white",
                isCurrent &&
                  !mismatched &&
                  "border-[var(--primary)] bg-card text-[var(--primary)] shadow-[0_0_0_4px_var(--primary)/15]",
                isCurrent &&
                  mismatched &&
                  (i === 2
                    ? "border-[var(--destructive)] bg-card text-[var(--destructive)] shadow-[0_0_0_4px_var(--destructive)/15]"
                    : "border-primary/40 bg-card text-primary"),
                !done && !isCurrent && "border-border bg-card text-muted-foreground"
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : isCurrent && mismatched && i === 2 ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CircleDashed className="h-3 w-3" />
              )}
            </span>

            {/* label */}
            <div className={cn("pb-5 pt-1", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium leading-none",
                  isCurrent ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {mismatched && i === 2 ? "Mismatch" : "Current"}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{step.caption}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}