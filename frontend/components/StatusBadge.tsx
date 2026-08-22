"use client";

import { cn } from "@/lib/utils";
import type { P2PStatus } from "@/lib/contracts/types";

const STATUS_META: Record<
  P2PStatus,
  { label: string; dot: string; text: string; ring: string }
> = {
  CREATED: {
    label: "Created",
    dot: "bg-muted-foreground/60",
    text: "text-foreground",
    ring: "border-border bg-card",
  },
  PARTIAL: {
    label: "Awaiting counterparty",
    dot: "bg-[var(--warning)]",
    text: "text-[var(--warning)]",
    ring: "border-[var(--warning)]/30 bg-[var(--warning)]/5",
  },
  ACTIVE: {
    label: "Active · private",
    dot: "bg-[var(--success)]",
    text: "text-[var(--success)]",
    ring: "border-[var(--success)]/30 bg-[var(--success)]/5",
  },
  MISMATCHED: {
    label: "Commits mismatched",
    dot: "bg-[var(--destructive)]",
    text: "text-[var(--destructive)]",
    ring: "border-[var(--destructive)]/30 bg-[var(--destructive)]/5",
  },
  DISPUTED: {
    label: "Dispute · terms revealed",
    dot: "bg-[var(--destructive)]",
    text: "text-[var(--destructive)]",
    ring: "border-[var(--destructive)]/30 bg-[var(--destructive)]/5",
  },
  RESOLVED: {
    label: "Resolved",
    dot: "bg-[var(--accent)]",
    text: "text-[var(--accent)]",
    ring: "border-[var(--accent)]/30 bg-[var(--accent)]/5",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: P2PStatus;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.CREATED;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
        meta.ring,
        meta.text,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}