"use client";

import { useRef, useEffect } from "react";
import type { P2PState } from "../contracts/types";
import { success, warning, info } from "../utils/toast";
import { diffState, snapshotOf, withinHours } from "./notifications";

const DAY = 24 * 3600_000;

const toastByKind = {
  success,
  warning,
  info,
} as const;

/**
 * Watches the polled contract state and surfaces user-facing notifications
 * on meaningful transitions (status changes, counterparty actions) and when
 * deadlines draw near. No-ops while in demo mode.
 */
export function useContractNotifications(
  state: P2PState | null | undefined
): void {
  const prevRef = useRef<ReturnType<typeof snapshotOf> | null>(null);
  const warnedDeadlinesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!state) {
      prevRef.current = null;
      return;
    }

    const first = prevRef.current === null;
    const next = snapshotOf(state);
    const prev = prevRef.current;
    prevRef.current = next;

    if (first || !prev) return; // don't notify on initial load

    for (const n of diffState(prev, next, state)) {
      toastByKind[n.kind](n.title, n.description ? { description: n.description } : undefined);
    }

    // Deadline warnings — notify once per deadline value
    const deadlines: [string, string][] = [
      [state.open_dispute_deadline, "Open-dispute window expires in under 24 hours."],
      [state.resolve_deadline, "Resolution window expires in under 24 hours."],
    ];
    for (const [dl, msg] of deadlines) {
      if (withinHours(dl, 24) && !warnedDeadlinesRef.current.has(dl)) {
        warnedDeadlinesRef.current.add(dl);
        warning("Deadline approaching", { description: msg });
      }
    }
  }, [state]);
}

export default useContractNotifications;