"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Check, X, KeyRound, BadgeCheck } from "lucide-react";
import type { P2PState } from "@/lib/contracts/types";
import { computeCommitHash, sha256HexText } from "@/lib/contracts/commitHash";
import { useAcknowledgeParty } from "@/lib/hooks/usePrivateP2P";
import { useWallet } from "@/lib/genlayer/wallet";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

interface Props {
  state: P2PState;
  myRole: "A" | "B" | null;
  demoAcknowledgeParty?: () => void;
}

/**
 * Lets a connected party prove — from the browser — that the contract deployed
 * on-chain commits to EXACTLY the terms they agreed, then record a one-time,
 * irreversible on-chain acknowledgment. Anomalies (mismatches) are shown as
 * red flags, so nothing on-chain can be silently altered.
 */
export function ContractVerifier({ state, myRole, demoAcknowledgeParty }: Props) {
  const { address } = useWallet();
  const { acknowledgeParty, isAcknowledging } = useAcknowledgeParty();
  const isDemo = !!demoAcknowledgeParty;
  const [terms, setTerms] = useState("");
  const [salt, setSalt] = useState("");

  const myCommit = myRole === "A" ? state.commit_a : myRole === "B" ? state.commit_b : "";

  const iAcked =
    (myRole === "A" && state.ack_a === "1") ||
    (myRole === "B" && state.ack_b === "1");
  const otherAcked =
    (myRole === "A" && state.ack_b === "1") ||
    (myRole === "B" && state.ack_a === "1");
  const canAck =
    !!myRole &&
    !iAcked &&
    (state.status === "CREATED" ||
      state.status === "PARTIAL" ||
      state.status === "ACTIVE");

  const [digest, setDigest] = useState<string | null>(null);
  const [termsH, setTermsH] = useState<string | null>(null);
  const [saltH, setSaltH] = useState<string | null>(null);

  useEffect(() => {
    if (!terms || !salt) {
      setDigest(null);
      setTermsH(null);
      setSaltH(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      computeCommitHash(terms, salt),
      sha256HexText(terms),
      sha256HexText(salt),
    ]).then(([d, t, s]) => {
      if (!cancelled) {
        setDigest(d);
        setTermsH(t);
        setSaltH(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [terms, salt]);

  const hasDigest = !!digest;
  const commitMatches = hasDigest && !!myCommit && digest === myCommit;
  const identityTerms =
    hasDigest && !!state.terms_sha256 && termsH === state.terms_sha256;
  const identitySalt =
    hasDigest && !!state.salt_sha256 && saltH === state.salt_sha256;
  const allVerified =
    hasDigest &&
    commitMatches &&
    (!state.terms_sha256 || identityTerms) &&
    (!state.salt_sha256 || identitySalt);

  const Row = ({
    ok,
    label,
    detail,
    neutral,
  }: {
    ok: boolean;
    label: string;
    detail: string;
    neutral?: boolean;
  }) => (
    <div className="flex items-start gap-2 text-xs">
      <span
        className={
          neutral
            ? "text-muted-foreground"
            : ok
              ? "text-[var(--success)]"
              : "text-[var(--destructive)]"
        }
      >
        {neutral ? (
          <KeyRound className="h-3.5 w-3.5" />
        ) : ok ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="min-w-0">
        <span className="font-medium text-foreground">{label}</span>
        <p className="text-muted-foreground break-all font-mono">{detail}</p>
      </div>
    </div>
  );

  return (
    <div className="brand-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
        <p className="section-label">
          Verify your commitment
          {myRole ? ` · as Party ${myRole}` : " · (observer)"}
        </p>
      </div>

      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        Enter the <b>terms</b> and <b>salt</b> you agreed on. The app computes the
        on-chain digest and identity hashes and compares them against this
        contract — proving it commits to exactly your agreement, with nothing
        altered.
      </p>

      {myRole && (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ver-terms">Your agreed terms</Label>
            <Textarea
              id="ver-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              placeholder="Paste the exact terms you agreed on"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ver-salt">Your salt</Label>
            <Input
              id="ver-salt"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="The salt you used when committing"
              className="font-mono text-xs"
            />
          </div>
        </div>
      )}

      {!myRole && (
        <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Connect a wallet that is Party A or Party B on this contract to verify
          commitments. You can still inspect the on-chain state in the terminal
          below.
        </p>
      )}

      {digest && (
        <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
          <Row
            ok={commitMatches}
            label="Commitment digest"
            detail={
              commitMatches
                ? `${digest.slice(0, 18)}… ✓ matches on-chain`
                : `${digest.slice(0, 18)}… (on-chain: ${myCommit ? myCommit.slice(0, 18) + "…" : "—"})`
            }
          />
          <Row
            ok={identityTerms}
            neutral={!state.terms_sha256}
            label="Terms identity (sha256)"
            detail={
              state.terms_sha256
                ? termsH === state.terms_sha256
                  ? "matches on-chain identity"
                  : "does NOT match on-chain identity"
                : "identity not committed on this contract"
            }
          />
          <Row
            ok={identitySalt}
            neutral={!state.salt_sha256}
            label="Salt identity (sha256)"
            detail={
              state.salt_sha256
                ? saltH === state.salt_sha256
                  ? "matches on-chain identity"
                  : "does NOT match on-chain identity"
                : "identity not committed on this contract"
            }
          />
        </div>
      )}

      {digest && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            allVerified
              ? "border-[var(--success)]/40 bg-[var(--success)]/5 text-[var(--success)]"
              : "border-[var(--destructive)]/40 bg-[var(--destructive)]/5 text-[var(--destructive)]"
          }`}
        >
          {allVerified ? (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 shrink-0" />
          )}
          <span>
            {allVerified
              ? "Verified: this contract commits to your exact terms — no manipulation."
              : "Mismatch detected: the inputs do not match the on-chain commitments."}
          </span>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold">On-chain acknowledgment</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Once verified, record it on-chain: <b>one-time, irreversible per party</b>{" "}
          — the contract can never be "double-verified".
        </p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span
            className={
              state.ack_a === "1"
                ? "inline-flex items-center gap-1 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-0.5 text-[var(--success)]"
                : "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground"
            }
          >
            {state.ack_a === "1" ? <Check className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
            Party A {state.ack_a === "1" ? "acknowledged" : "pending"}
          </span>
          <span
            className={
              state.ack_b === "1"
                ? "inline-flex items-center gap-1 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-0.5 text-[var(--success)]"
                : "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground"
            }
          >
            {state.ack_b === "1" ? <Check className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
            Party B {state.ack_b === "1" ? "acknowledged" : "pending"}
          </span>
        </div>
        {canAck && (
          <Button
            variant={iAcked ? "secondary" : "outline"}
            size="sm"
            disabled={!address || isAcknowledging}
            onClick={() =>
              isDemo ? demoAcknowledgeParty!() : acknowledgeParty({})
            }
          >
            <BadgeCheck className="h-3.5 w-3.5 mr-1" />
            {isAcknowledging
              ? "Recording…"
              : iAcked
                ? "Acknowledged — awaiting counterparty"
                : "Acknowledge on-chain"}
          </Button>
        )}
        {!canAck && myRole && (
          <p className="text-[11px] text-muted-foreground">
            {iAcked
              ? otherAcked
                ? "Both parties have acknowledged — contract locked in."
                : "You acknowledged. Awaiting the counterparty."
              : "Acknowledgment is only available before a dispute is opened."}
          </p>
        )}
      </div>
    </div>
  );
}

export default ContractVerifier;