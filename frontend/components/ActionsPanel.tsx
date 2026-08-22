"use client";

import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  Undo2,
  Scale,
} from "lucide-react";
import type { P2PState } from "@/lib/contracts/types";
import {
  useRequestCompletion,
  useRetractCompletion,
  useRequestDispute,
  useWithdrawDisputeRequest,
  useResetCommits,
  useRetractCommit,
  useForceCompletion,
  useCommitClauses,
  useRevealClause,
} from "@/lib/hooks/usePrivateP2P";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { DeadlineCountdown } from "./DeadlineCountdown";
import { ClauseProofsSection } from "./ClauseProofsSection";
import { useState } from "react";

interface Props {
  state: P2PState;
  myRole: "A" | "B" | null;
  contractAddress?: string;
  demoRequestCompletion?: () => void;
  demoRequestDispute?: () => void;
  demoCommitClauses?: (clauseHashes: string[]) => void;
  demoRetractCommit?: () => void;
  demoResetCommits?: () => void;
  demoRetractCompletion?: () => void;
  demoWithdrawDisputeRequest?: () => void;
}

export function ActionsPanel({
  state,
  myRole,
  contractAddress,
  demoRequestCompletion,
  demoRequestDispute,
  demoCommitClauses,
  demoRetractCommit,
  demoResetCommits,
  demoRetractCompletion,
  demoWithdrawDisputeRequest,
}: Props) {
  const { address } = useWallet();
  const { requestCompletion, isApproving } = useRequestCompletion(contractAddress);
  const { retractCompletion, isRetracting: isRetractingApproval } =
    useRetractCompletion(contractAddress);
  const { requestDispute, isRequesting } = useRequestDispute(contractAddress);
  const { withdrawDisputeRequest, isWithdrawing } = useWithdrawDisputeRequest(contractAddress);
  const { resetCommits, isResetting } = useResetCommits(contractAddress);
  const { retractCommit, isRetracting: isRetractingCommit } = useRetractCommit(contractAddress);
  const { forceCompletion, isForcing } = useForceCompletion(contractAddress);
  const { commitClauses, isRecording } = useCommitClauses(contractAddress);
  const { revealClause, isRevealing } = useRevealClause(contractAddress);
  const isDemo = !!demoRequestCompletion;
  const canAct = isDemo || !!address;

  const [showForceClose, setShowForceClose] = useState(false);
  const [isForceClosing, setIsForceClosing] = useState(false);
  const [showRequestDispute, setShowRequestDispute] = useState(false);
  const [isRequestingConfirm, setIsRequestingConfirm] = useState(false);

  const iApproved =
    (myRole === "A" && state.complete_a === "1") ||
    (myRole === "B" && state.complete_b === "1");
  const otherApproved =
    (myRole === "A" && state.complete_b === "1") ||
    (myRole === "B" && state.complete_a === "1");

  const iRequestedCompletion =
    state.completion_requested_at !== "" &&
    (myRole === "A"
      ? state.completion_requested_by === state.party_a
      : state.completion_requested_by === state.party_b);

  const disputeRequested = state.dispute_requested === "1";
  const iRequestedDispute =
    disputeRequested &&
    (myRole === "A"
      ? state.dispute_requested_by === state.party_a
      : state.dispute_requested_by === state.party_b);

  const iCommitted =
    (myRole === "A" && state.commit_a !== "") ||
    (myRole === "B" && state.commit_b !== "");
  const canRetractCommit =
    iCommitted && (state.status === "PARTIAL" || state.status === "MISMATCHED");

  const stepLabel =
    state.status === "ACTIVE"
      ? "Decide how the matter concludes"
      : "Recoordinate commitments";

  if (state.status === "ACTIVE") {
    const completionLocked = disputeRequested;
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-serif text-xs font-semibold text-primary">
            02
          </span>
          <h2 className="text-sm font-semibold">{stepLabel}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Private completion */}
          <div className="brand-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
              <h3 className="text-sm font-semibold">Close privately</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Both signatories approve and the matter closes — the terms are
              never written to the chain.
            </p>

            {!completionLocked ? (
              <>
                <div className="flex gap-3 text-xs">
                  <span
                    className={
                      iApproved ? "text-[var(--success)]" : "text-muted-foreground"
                    }
                  >
                    You: {iApproved ? "approved ✓" : "not yet"}
                  </span>
                  <span
                    className={
                      otherApproved
                        ? "text-[var(--success)]"
                        : "text-muted-foreground"
                    }
                  >
                    {myRole === "A" ? "Party B" : "Party A"}:{" "}
                    {otherApproved ? "approved ✓" : "not yet"}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[var(--success)] transition-all duration-500"
                    style={{
                      width: `${(iApproved ? 50 : 0) + (otherApproved ? 50 : 0)}%`,
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={iApproved ? "secondary" : "success"}
                    onClick={() =>
                      isDemo ? demoRequestCompletion!() : requestCompletion()
                    }
                    disabled={!canAct || !myRole || isApproving || iApproved}
                  >
                    {isApproving
                      ? "Approving…"
                      : iApproved
                        ? otherApproved
                          ? "Approved — closing"
                          : "Approved — awaiting counterparty"
                        : "Approve private close"}
                  </Button>
                  {iApproved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        isDemo
                          ? demoRetractCompletion!()
                          : retractCompletion()
                      }
                      disabled={isRetractingApproval}
                    >
                      <Undo2 className="w-3 h-3" />
                      Withdraw
                    </Button>
                  )}
                </div>

                {iRequestedCompletion && iApproved && !otherApproved && (
                  <div className="space-y-2 rounded-lg border border-dashed border-muted px-3 py-2.5 text-xs">
                    <p className="text-muted-foreground leading-relaxed">
                      If your counterparty never responds, you may close the
                      contract yourself after the 7-day response window.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        isDemo ? undefined : setShowForceClose(true)
                      }
                      disabled={!canAct || isForcing || isDemo}
                    >
                      {isForcing ? "Forcing…" : "Force close"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertTitle>Completion locked</AlertTitle>
                <AlertDescription>
                  A dispute has been requested. Private closure is unavailable.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Dispute */}
          <div className="brand-card p-5 space-y-4 border-[var(--destructive)]/20">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-[var(--destructive)]" />
              <h3 className="text-sm font-semibold">Open a dispute</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Lock the dispute so the terms are revealed on-chain and the GenLayer
              AI jury can arbitrate.
            </p>
            {disputeRequested ? (
              <Alert variant="destructive">
                <AlertTitle>
                  Dispute requested by {iRequestedDispute ? "you" : "your counterparty"}
                </AlertTitle>
                <AlertDescription>
                  {iRequestedDispute
                    ? "Completion is locked. Reveal the terms in the next step."
                    : "Completion is locked while the dispute proceeds."}
                </AlertDescription>
              </Alert>
            ) : (
              <p className="rounded-lg bg-[var(--destructive)]/5 px-3 py-2 text-xs text-[var(--destructive)]">
                Warning: locking a dispute blocks private closure and publishes
                the terms on-chain.
              </p>
            )}
            {disputeRequested && state.open_dispute_deadline && (
              <DeadlineCountdown
                deadline={state.open_dispute_deadline}
                label="Open-dispute window"
                compact
              />
            )}
            {!disputeRequested ? (
              <Button
                variant="destructive"
                onClick={() =>
                  isDemo
                    ? demoRequestDispute!()
                    : setShowRequestDispute(true)
                }
                disabled={!canAct || !myRole || isRequesting}
              >
                {isRequesting ? "Requesting…" : "Request dispute"}
              </Button>
            ) : (
              iRequestedDispute && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    isDemo
                      ? demoWithdrawDisputeRequest!()
                      : withdrawDisputeRequest()
                  }
                  disabled={isWithdrawing}
                >
                  <Undo2 className="w-3 h-3" />
                  {isWithdrawing ? "Withdrawing…" : "Withdraw dispute request"}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Clause proofs — partial reveal */}
        <ClauseProofsSection
          state={state}
          myRole={myRole}
          address={address}
          isDemo={isDemo}
          isRecording={isRecording}
          isRevealing={isRevealing}
          onRecord={(hashes) =>
            isDemo ? demoCommitClauses!(hashes) : commitClauses({ clauseHashes: hashes })
          }
          onReveal={(index, clauseText, salt) =>
            revealClause({ index, clauseText, salt })
          }
        />

        <ConfirmDialog
          open={showForceClose}
          title="Force close the contract?"
          description="Your counterparty has not responded. This publishes the private close on-chain. They had the full response window to dispute it — proceeding is irreversible."
          confirmLabel="Force close"
          variant="destructive"
          busy={isForceClosing}
          onConfirm={async () => {
            setIsForceClosing(true);
            await forceCompletion();
            setIsForceClosing(false);
            setShowForceClose(false);
          }}
          onCancel={() => setShowForceClose(false)}
        />
        <ConfirmDialog
          open={showRequestDispute}
          title="Request a dispute?"
          description="This locks private completion immediately. You must then reveal the terms with your salt to open the dispute. The counterparty will see the request."
          confirmLabel="Request dispute"
          variant="destructive"
          busy={isRequestingConfirm}
          onConfirm={async () => {
            setIsRequestingConfirm(true);
            await requestDispute();
            setIsRequestingConfirm(false);
            setShowRequestDispute(false);
          }}
          onCancel={() => setShowRequestDispute(false)}
        />
      </section>
    );
  }

  if (state.status === "MISMATCHED" || state.status === "PARTIAL") {
    const iConsentedToReset =
      (myRole === "A" && state.reset_a === "1") ||
      (myRole === "B" && state.reset_b === "1");
    const otherConsentedToReset =
      (myRole === "A" && state.reset_b === "1") ||
      (myRole === "B" && state.reset_a === "1");
    const bothConsented = iConsentedToReset && otherConsentedToReset;

    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-serif text-xs font-semibold text-primary">
            02
          </span>
          <h2 className="text-sm font-semibold">{stepLabel}</h2>
        </div>

        <div
          className={
            state.status === "MISMATCHED"
              ? "space-y-3"
              : "space-y-3"
          }
        >
          <Alert
            variant={state.status === "MISMATCHED" ? "destructive" : "default"}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {state.status === "MISMATCHED"
                ? "Commitment mismatch"
                : "Commitment in progress"}
            </AlertTitle>
            <AlertDescription>
              {state.status === "MISMATCHED"
                ? "The two digests differ — the parties are not agreeing on identical terms. Retract your own commit and re-commit the agreed value, or coordinate a full reset (both parties)."
                : "One commitment is on record. You may retract your own if you need to change it."}
            </AlertDescription>
          </Alert>

          <div className="brand-card p-4 flex flex-wrap items-center gap-2">
            {canRetractCommit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isDemo ? demoRetractCommit!() : retractCommit()
                }
                disabled={!canAct || isRetractingCommit}
              >
                <Undo2 className="w-3 h-3" />
                {isRetractingCommit ? "Retracting…" : "Retract my commit"}
              </Button>
            )}
            {myRole && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isDemo ? demoResetCommits!() : resetCommits()
                }
                disabled={isResetting || !canAct}
              >
                <RotateCcw className="w-3 h-3" />
                {isResetting
                  ? "Recording consent…"
                  : bothConsented
                    ? "Both approved — resetting"
                    : iConsentedToReset
                      ? "Consent recorded · awaiting counterparty"
                      : "Reset commits (needs both parties)"}
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return null;
}