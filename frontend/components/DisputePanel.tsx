"use client";

import { useState } from "react";
import { Scale, FileWarning, Send, Gavel, Eye, MessageSquare, Link2 } from "lucide-react";
import type { P2PState } from "@/lib/contracts/types";
import {
  useOpenDispute,
  useSubmitStatement,
  useResolveDispute,
  useForceResolveDispute,
  useRequestClarification,
  useSubmitEvidence,
} from "@/lib/hooks/usePrivateP2P";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { DeadlineCountdown } from "./DeadlineCountdown";

interface Props {
  state: P2PState;
  myRole: "A" | "B" | null;
  contractAddress?: string;
  demoOpenDispute?: (terms: string) => void;
  demoSubmitStatement?: (statement: string) => void;
  demoRequestClarification?: () => void;
  demoResolveDispute?: () => void;
  demoSubmitEvidence?: (urls: string[]) => void;
}

export function DisputePanel({
  state,
  myRole,
  contractAddress,
  demoOpenDispute,
  demoSubmitStatement,
  demoRequestClarification,
  demoResolveDispute,
  demoSubmitEvidence,
}: Props) {
  const { address } = useWallet();
  const { openDispute, isOpening } = useOpenDispute(contractAddress);
  const { submitStatement, isSubmitting } = useSubmitStatement(contractAddress);
  const { resolveDispute, isResolving } = useResolveDispute(contractAddress);
  const { forceResolveDispute, isForcing } = useForceResolveDispute(contractAddress);
  const { requestClarification, isRequesting: isClarifying } =
    useRequestClarification(contractAddress);
  const { submitEvidence, isSubmittingEvidence } = useSubmitEvidence(contractAddress);
  const isDemo = !!demoOpenDispute;
  const canAct = isDemo || !!address;

  const [terms, setTerms] = useState("");
  const [salt, setSalt] = useState("");
  const [statement, setStatement] = useState("");
  const [evidenceDraft, setEvidenceDraft] = useState("");
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showForceResolveConfirm, setShowForceResolveConfirm] = useState(false);
  const [isForcedResolving, setIsForcedResolving] = useState(false);

  const myStatement =
    myRole === "A" ? state.statement_a : myRole === "B" ? state.statement_b : "";
  const otherSubmitted =
    (myRole === "A" && state.statement_b !== "") ||
    (myRole === "B" && state.statement_a !== "");

  const handleReveal = async () => {
    if (!terms || !salt) return;
    if (isDemo) {
      demoOpenDispute!(terms);
    } else {
      await openDispute({ terms, salt });
    }
  };

  const handleStatement = async () => {
    if (!statement.trim()) return;
    if (isDemo) {
      demoSubmitStatement!(statement.trim());
    } else {
      await submitStatement({ statement: statement.trim() });
    }
    setStatement("");
  };

  const myEvidence = myRole === "A" ? state.evidence_a : myRole === "B" ? state.evidence_b : [];
  const otherEvidence = myRole === "A" ? state.evidence_b : myRole === "B" ? state.evidence_a : [];

  const parseEvidence = (raw: string): string[] =>
    raw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//.test(u))
      .slice(0, 3);

  const handleSubmitEvidence = async () => {
    const urls = parseEvidence(evidenceDraft);
    if (urls.length === 0) return;
    if (isDemo) {
      demoSubmitEvidence!(urls);
    } else {
      await submitEvidence({ urls });
    }
    setEvidenceDraft("");
  };

  const validEvidenceDraft = parseEvidence(evidenceDraft).length > 0;

  if (state.status === "ACTIVE") {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-serif text-xs font-semibold text-primary">
            03
          </span>
          <h2 className="text-sm font-semibold">Evidence &amp; arbitration</h2>
        </div>

        <div className="brand-card p-5 space-y-4 border-[var(--destructive)]/20">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-[var(--destructive)]" />
            <h3 className="text-sm font-semibold">Reveal terms &amp; open dispute</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter the exact terms and salt used at commit time. The contract
            verifies they hash to the agreed digest, then publishes them.
          </p>
          <div className="space-y-2">
            <Label htmlFor="d-terms">Terms</Label>
            <Textarea
              id="d-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value.slice(0, 4096))}
              rows={3}
              maxLength={4096}
              placeholder="The exact terms you committed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-salt">Salt</Label>
            <Input
              id="d-salt"
              className="font-mono"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="The salt you used when committing"
            />
          </div>
          <Button
            variant="destructiveSolid"
            onClick={() =>
              isDemo ? handleReveal() : setShowRevealConfirm(true)
            }
            disabled={!canAct || !myRole || isOpening || !terms || !salt}
          >
            {isOpening ? "Revealing…" : "Reveal terms &amp; open dispute"}
          </Button>
          <ConfirmDialog
            open={showRevealConfirm}
            title="Reveal terms &amp; open dispute?"
            description="This publishes the full agreement terms on-chain permanently. The counterparty and everyone can now see them. This action is irreversible — only proceed to resolve an actual disagreement."
            confirmLabel="Reveal terms"
            variant="destructive"
            busy={isRevealing}
            onConfirm={async () => {
              setIsRevealing(true);
              await handleReveal();
              setIsRevealing(false);
              setShowRevealConfirm(false);
            }}
            onCancel={() => setShowRevealConfirm(false)}
          />
        </div>
      </section>
    );
  }

  if (state.status === "DISPUTED") {
    const bothSubmitted = state.statement_a !== "" && state.statement_b !== "";
    const iReviewedEvidence =
      (myRole === "A" && state.evidence_reviewed_a === "1") ||
      (myRole === "B" && state.evidence_reviewed_b === "1");
    const otherReviewedEvidence =
      (myRole === "A" && state.evidence_reviewed_b === "1") ||
      (myRole === "B" && state.evidence_reviewed_a === "1");
    const bothReviewedEvidence = iReviewedEvidence && otherReviewedEvidence;
    const readyToResolve = bothSubmitted && bothReviewedEvidence;
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--destructive)]/10 font-serif text-xs font-semibold text-[var(--destructive)]">
            !
          </span>
          <h2 className="text-sm font-semibold">Dispute proceedings</h2>
        </div>

        <div className="brand-card p-5 space-y-4 border-[var(--destructive)]/20">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[var(--destructive)]" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Dispute in progress</h3>
              <p className="text-xs text-muted-foreground">
                The terms are now public on-chain.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--destructive)]">
              <Eye className="h-3 w-3" />
              Revealed
            </span>
          </div>

          <div>
            <p className="section-label mb-1.5">Revealed terms</p>
            <blockquote className="rounded-lg border border-border bg-muted/50 px-4 py-3 font-serif text-sm italic leading-relaxed text-foreground">
              {state.terms}
            </blockquote>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-muted-foreground">
                Party A statement
                {state.statement_a_version !== "0" && (
                  <span className="ml-1 text-muted-foreground/60">
                    v{state.statement_a_version}
                  </span>
                )}
              </span>
              <span
                className={
                  state.statement_a
                    ? "text-[var(--success)]"
                    : "text-[var(--warning)]"
                }
              >
                {state.statement_a ? "recorded ✓" : "pending"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-muted-foreground">
                Party B statement
                {state.statement_b_version !== "0" && (
                  <span className="ml-1 text-muted-foreground/60">
                    v{state.statement_b_version}
                  </span>
                )}
              </span>
              <span
                className={
                  state.statement_b
                    ? "text-[var(--success)]"
                    : "text-[var(--warning)]"
                }
              >
                {state.statement_b ? "recorded ✓" : "pending"}
              </span>
            </div>
          </div>

          {myRole && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <Label htmlFor="stmt">
                Your statement (Party {myRole})
                {myStatement && (
                  <span className="ml-1 text-muted-foreground font-normal">
                    — you may revise it before arbitration.
                  </span>
                )}
              </Label>
              <Textarea
                id="stmt"
                value={statement}
                onChange={(e) => setStatement(e.target.value.slice(0, 4096))}
                rows={3}
                maxLength={4096}
                placeholder="Explain your side, referencing the revealed terms…"
                aria-describedby="stmt-char-limit"
              />
              <div className="flex items-center justify-between gap-3">
                <p
                  id="stmt-char-limit"
                  className="text-[11px] text-muted-foreground"
                >
                  {statement.length}/4096 characters
                </p>
                <div className="flex justify-end">
                <Button
                  variant="blue"
                  size="sm"
                  onClick={handleStatement}
                  disabled={!canAct || isSubmitting || !statement.trim()}
                >
                  <Send className="w-3 h-3" />
                  {isSubmitting
                    ? "Submitting…"
                    : myStatement
                      ? "Update statement"
                      : "Submit statement"}
                </Button>
                </div>
              </div>
            </div>
          )}

<div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Evidence URLs</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Attach up to 3 public URLs (delivery tracking, reports, receipts)
              proving your side. During arbitration the validator network
              fetches these pages on-chain and only credits claims the fetched
              content supports; the exact fetched text is snapshotted by digest.
            </p>

            <div className="grid gap-2 text-xs">
              <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <span className="font-medium">Party A evidence</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {state.evidence_a.length > 0 ? (
                    state.evidence_a.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-mono text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        {u}
                      </a>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <span className="font-medium">Party B evidence</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {state.evidence_b.length > 0 ? (
                    state.evidence_b.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-mono text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        {u}
                      </a>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>

            {myRole && (
              <div className="space-y-2">
                <Label htmlFor="evidence">Your evidence URLs (comma / newline separated)</Label>
                <Textarea
                  id="evidence"
                  value={evidenceDraft}
                  onChange={(e) => setEvidenceDraft(e.target.value)}
                  rows={2}
                  placeholder="https://…"
                  className="text-xs font-mono"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {myEvidence.length > 0
                      ? `On record (Party ${myRole}): ${myEvidence.length} URL(s)`
                      : iReviewedEvidence
                        ? "You marked \"no evidence\"."
                        : "No evidence recorded by you yet."}
                  </p>
                  <div className="flex gap-2">
                    {!iReviewedEvidence && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isDemo ? demoSubmitEvidence!([]) : submitEvidence({ urls: [] })
                        }
                        disabled={!canAct || isSubmittingEvidence}
                      >
                        {isSubmittingEvidence
                          ? "Submitting…"
                          : "I have no evidence to submit"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubmitEvidence}
                      disabled={!canAct || isSubmittingEvidence || !validEvidenceDraft}
                    >
                      {isSubmittingEvidence
                        ? "Submitting…"
                        : myEvidence.length > 0
                          ? "Replace my evidence"
                          : "Record my evidence"}
                    </Button>
                  </div>
                </div>
                {!iReviewedEvidence && (
                  <p className="text-[11px] text-muted-foreground">
                    Arbitration is locked until BOTH parties complete their
                    evidence input.
                  </p>
                )}
              </div>
            )}
          </div>

          {myRole && !bothSubmitted && (
            <div className="space-y-2 rounded-lg border border-dashed border-muted p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Need clarification?</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If the counterparty&apos;s statement is unclear, you can nudge
                them to revise it before arbitration.
              </p>
              {state.clarification_requested_at && (
                <p className="text-xs text-muted-foreground">
                  Clarification requested at{" "}
                  <span className="font-mono">
                    {state.clarification_requested_at}
                  </span>
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isDemo ? demoRequestClarification!() : requestClarification()
                }
                disabled={!canAct || isClarifying}
              >
                {isClarifying ? "Sending…" : "Request clarification"}
              </Button>
            </div>
          )}

          {bothSubmitted && !readyToResolve && (
            <div className="space-y-2 rounded-lg border border-dashed border-muted p-4">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Awaiting evidence input</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {!iReviewedEvidence && !otherReviewedEvidence
                  ? "Both parties still need to complete their evidence input."
                  : !iReviewedEvidence
                    ? "You still need to complete your evidence input (submit URLs or mark \"no evidence\")."
                    : "Awaiting the counterparty to complete their evidence input."}
              </p>
            </div>
          )}

          {bothSubmitted && readyToResolve && (
            <div className="space-y-2 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-4">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold">Ready for arbitration</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The GenLayer validator network runs an AI jury over both
                statements and the fetched evidence, then reaches consensus.
                This typically takes 30–60 seconds.
              </p>
              {Number(state.resolve_attempts) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Resolution attempts: {state.resolve_attempts}
                </p>
              )}
              <Button
                variant="gradient"
                onClick={() =>
                  isDemo ? demoResolveDispute!() : resolveDispute()
                }
                disabled={isResolving}
              >
                {isResolving ? "Arbitrating…" : "Resolve with AI jury"}
              </Button>
            </div>
          )}

          {state.resolve_deadline && (
            <div className="space-y-2.5 rounded-lg border border-dashed border-muted p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground leading-relaxed">
                  {bothSubmitted
                    ? "After the resolution window passes, either party may force-resolution with the same AI jury."
                    : state.statement_a !== "" || state.statement_b !== ""
                      ? "After the deadline, the responsive party may obtain a default judgment."
                      : "A statement is still required before forcing."}
                </p>
                <DeadlineCountdown
                  deadline={state.resolve_deadline}
                  label="Resolution window"
                  onExpired={() => undefined}
                />
              </div>
              {(bothSubmitted ||
                state.statement_a !== "" ||
                state.statement_b !== "") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    isDemo ? undefined : setShowForceResolveConfirm(true)
                  }
                  disabled={!canAct || isForcing || isDemo}
                >
                  {isForcing ? "Forcing…" : "Force resolve"}
                </Button>
              )}
            </div>
          )}
          <ConfirmDialog
            open={showForceResolveConfirm}
            title="Force-resolve the dispute?"
            description="The resolution deadline has passed. Proceeding will settle the dispute — with the same AI jury if both parties submitted statements, or a default judgment for the responsive party otherwise."
            confirmLabel="Force resolve"
            variant="destructive"
            busy={isForcedResolving}
            onConfirm={async () => {
              setIsForcedResolving(true);
              await forceResolveDispute();
              setIsForcedResolving(false);
              setShowForceResolveConfirm(false);
            }}
            onCancel={() => setShowForceResolveConfirm(false)}
          />
        </div>
      </section>
    );
  }

  return null;
}