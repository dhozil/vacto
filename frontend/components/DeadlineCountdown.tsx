"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface DeadlineCountdownProps {
  deadline: string;
  label?: string;
  onExpired?: () => void;
  className?: string;
  /** Toggle compact display (no prefix icon). */
  compact?: boolean;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Parses "2026-01-01T00:00:00Z". */
function parseDeadline(raw: string): number {
  if (!raw) return 0;
  const s = raw.trim().replace(/Z$/i, "");
  const dt = new Date(`${s}Z`);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
}

export function DeadlineCountdown({
  deadline,
  label,
  onExpired,
  className = "",
  compact = false,
}: DeadlineCountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deadlineMs = parseDeadline(deadline);
  const remaining = deadlineMs ? deadlineMs - now : 0;
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired && deadlineMs > 0) onExpired?.();
  }, [expired, deadlineMs, onExpired]);

  if (!deadlineMs) return null;

  const critical = !expired && remaining < 24 * 3600 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs ${className}`}
      aria-live="polite"
      title={`Deadline reached at ${deadline}`}
    >
      {!compact &&
        (expired || critical ? (
          <AlertTriangle
            className={`h-3.5 w-3.5 ${
              expired ? "text-[var(--destructive)]" : "text-[var(--warning)]"
            }`}
            aria-hidden="true"
          />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        ))}
      <span
        className={
          expired
            ? "font-semibold text-[var(--destructive)]"
            : critical
              ? "font-medium text-[var(--warning)]"
              : "text-muted-foreground"
        }
      >
        {expired
          ? `${label ? `${label} expired` : "Expired"}`
          : `${label ? label : "Time remaining"}: ${formatRemaining(remaining)}`}
      </span>
      {expired && compact && <span className="sr-only">. Deadline has passed.</span>}
    </div>
  );
}

export default DeadlineCountdown;