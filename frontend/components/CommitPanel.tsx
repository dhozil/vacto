"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Wand2, ShieldCheck, Lock, ScrollText } from "lucide-react";
import type { P2PState } from "@/lib/contracts/types";
import { useCommitTerms, useCommitIdentity } from "@/lib/hooks/usePrivateP2P";
import { useWallet } from "@/lib/genlayer/wallet";
import {
  generateSalt,
  computeCommitHash,
  isSaltStrong,
  MIN_SALT_LENGTH,
  sha256HexText,
} from "@/lib/contracts/commitHash";
import { loadProfessionalSample } from "@/lib/contracts/sampleContract";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { TemplatePicker } from "./TemplatePicker";
import { safeStorage } from "@/lib/utils/safeStorage";
import { success } from "@/lib/utils/toast";

const STORAGE_KEY = "p2p_pending_commit";

interface Props {
  state: P2PState;
  myRole: "A" | "B" | null;
  contractAddress?: string;
  demoCommitTerms?: (commit: string) => void;
  demoCommitIdentity?: (termsSha256: string, saltSha256: string) => void;
}

export function CommitPanel({ state, myRole, contractAddress, demoCommitTerms, demoCommitIdentity }: Props) {
  const { address } = useWallet();
  const { commitTerms, isCommitting } = useCommitTerms(contractAddress);
  const { commitIdentity, isCommittingIdentity } = useCommitIdentity(contractAddress);
  const isDemo = !!demoCommitTerms;

  const [terms, setTerms] = useState("");
  const [salt, setSalt] = useState("");
  const [pastedHash, setPastedHash] = useState("");
  const [computedHash, setComputedHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCommittingConfirm, setIsCommittingConfirm] = useState(false);

  useEffect(() => {
    const saved = safeStorage.get(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTerms(parsed.terms || "");
        setSalt(parsed.salt || "");
        setPastedHash(parsed.commit || "");
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!terms || !salt) {
      setComputedHash("");
      return;
    }
    let cancelled = false;
    computeCommitHash(terms, salt).then((h) => {
      if (!cancelled) setComputedHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [terms, salt]);

  const alreadyCommittedA = state.commit_a !== "";
  const alreadyCommittedB = state.commit_b !== "";
  const iCommitted =
    (myRole === "A" && alreadyCommittedA) ||
    (myRole === "B" && alreadyCommittedB);
  const counterCommitted =
    (myRole === "A" && alreadyCommittedB) ||
    (myRole === "B" && alreadyCommittedA);

  const canCommit =
    myRole !== null &&
    state.status !== "ACTIVE" &&
    state.status !== "DISPUTED" &&
    state.status !== "RESOLVED" &&
    state.status !== "MISMATCHED" &&
    !iCommitted;

  const hashToSend = pastedHash.trim() || computedHash;
  const canSubmit = canCommit && !!hashToSend;

  const copyHash = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    success("Commit digest copied", {
      description: "Send this to your counterparty — never the terms.",
    });
  };

  const handleCommit = async () => {
    if (!canSubmit) return;
    if (isDemo) {
      demoCommitTerms!(hashToSend);
    } else {
      await commitTerms({ commit: hashToSend });
    }
    safeStorage.set(
      STORAGE_KEY,
      JSON.stringify({ terms, salt, commit: hashToSend })
    );
  };

  const handleCommitIdentity = async () => {
    if (!terms || !salt) return;
    const t = await sha256HexText(terms);
    const s = await sha256HexText(salt);
    if (isDemo) {
      demoCommitIdentity!(t, s);
    } else {
      await commitIdentity({ termsSha256: t, saltSha256: s });
    }
  };

  const identityDone =
    !!state.terms_sha256 && !!state.identity_a && !!state.identity_b;
  const identityPending =
    !identityDone &&
    myRole !== null &&
    !!terms &&
    !!salt &&
    (state.status === "CREATED" ||
      state.status === "PARTIAL" ||
      state.status === "ACTIVE");

  const myCommit =
    myRole === "A" ? state.commit_a : myRole === "B" ? state.commit_b : "";

  const stepHidden =
    !canCommit && state.status !== "ACTIVE" && state.status !== "MISMATCHED";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-serif text-xs font-semibold text-primary">
            01
          </span>
          <h2 className="text-sm font-semibold">Commit terms</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" />
          Only the hash is published
        </span>
      </div>

      {state.status === "ACTIVE" && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          The agreed terms stay <b>private</b> — only their digest is on-chain.
          They are revealed only if a dispute opens, and the reveal is verified
          against the committed hash (cannot be swapped).
        </p>
      )}

      {!address && (
        <Alert>
          <AlertTitle>Wallet required</AlertTitle>
          <AlertDescription>
            Connect your wallet above to commit terms to this contract.
          </AlertDescription>
        </Alert>
      )}

      {stepHidden && (
        <Alert>
          <AlertTitle>
            {state.status === "RESOLVED"
              ? "This matter is closed"
              : state.status === "DISPUTED"
                ? "Dispute in progress"
                : iCommitted
                  ? "Commitment recorded"
                  : "Awaiting commitments"}
          </AlertTitle>
          <AlertDescription>
            {iCommitted
              ? "You have committed. Share the hash with the counterparty so they commit the identical value."
              : state.status === "ACTIVE"
                ? "Both parties have committed — the contract is active."
                : "No action is needed right now."}
          </AlertDescription>
        </Alert>
      )}

      <div className="brand-card p-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="terms">Agreed terms</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Visible only to you until (and unless) a dispute is opened.
          </p>
          <TemplatePicker
            onApply={(rendered) => setTerms(rendered.slice(0, 4096))}
          />
          <Textarea
            id="terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value.slice(0, 4096))}
            placeholder="1. AGREEMENT AND PARTIES. This Agreement is entered into between Provider and Client…"
            rows={terms.length > 1200 ? 10 : 3}
            maxLength={4096}
            aria-describedby="terms-char-limit"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id="terms-char-limit" className="text-[11px] text-muted-foreground">
              {terms.length}/4096 characters
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const sample = loadProfessionalSample(true);
                setTerms(sample.terms.slice(0, 4096));
                setSalt(sample.salt);
              }}
            >
              <ScrollText className="h-3.5 w-3.5 mr-1" />
              Load professional sample
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salt">Salt (random secret key)</Label>
          <div className="flex gap-2">
            <Input
              id="salt"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder={`Share the exact salt with your counterparty (min ${MIN_SALT_LENGTH} chars)`}
              className="font-mono flex-1"
            />
            <Button
              type="button"
              variant="blue"
              onClick={() => setSalt(generateSalt())}
              title="Generate a random salt"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          </div>
          {salt.length > 0 && !isSaltStrong(salt) && (
            <p className="text-[11px] text-[var(--warning)]">
              Salt is the HMAC key protecting your terms from dictionary
              attacks — use at least {MIN_SALT_LENGTH} characters.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            The digest is HMAC-SHA256 keyed by the salt, so an on-chain observer
            cannot brute-force the terms from it.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pasted">…or paste the hash directly</Label>
          <Input
            id="pasted"
            value={pastedHash}
            onChange={(e) => setPastedHash(e.target.value)}
            placeholder="64-char sha-256 hex from your counterparty"
            className="font-mono"
          />
        </div>

        {computedHash && (
          <div
            className="rounded-lg border border-[var(--primary)]/20 bg-gradient-brand-soft p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3 w-3 text-primary" />
                Computed commit digest
              </span>
              <button
                onClick={() => copyHash(computedHash)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="block break-all font-mono text-xs text-foreground">
              {computedHash}
            </code>
            <p className="text-[11px] text-muted-foreground">
              Share this digest — never the terms — with your counterparty over a
              secure channel. They must commit the exact same value.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-[var(--primary)]/20 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={
                state.terms_sha256
                  ? "h-4 w-4 text-[var(--success)]"
                  : "h-4 w-4 text-muted-foreground"
              }
            />
            <h3 className="text-sm font-semibold">On-chain identity</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Record public sha256 commitments of the terms and salt so a dispute
            can be re-verified purely from chain state. The salt itself stays
            private off-chain.
          </p>
          {state.terms_sha256 ? (
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                terms sha256:{" "}
                <code className="font-mono">
                  {state.terms_sha256.slice(0, 16)}…
                </code>
              </p>
              <p>
                salt sha256:{" "}
                <code className="font-mono">
                  {state.salt_sha256.slice(0, 16)}…
                </code>
              </p>
              <p className="text-[var(--success)]">
                {identityDone
                  ? "Recorded & confirmed by both parties — immutable."
                  : "Recorded on-chain; awaiting the counterparty to confirm."}
              </p>
            </div>
          ) : (
            identityPending && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCommitIdentity}
                disabled={(!address && !isDemo) || !myRole || isCommittingIdentity}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                {isCommittingIdentity
                  ? "Committing…"
                  : "Commit public identity"}
              </Button>
            )
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="gradient"
            onClick={() => (isDemo ? handleCommit() : setShowConfirm(true))}
            disabled={!canSubmit || isCommitting}
          >
            {isCommitting
              ? "Committing…"
              : iCommitted
                ? "Committed ✓"
                : "Commit hash"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {myCommit ? (
              <>
                Your commit:{" "}
                <code className="font-mono text-foreground">
                  {myCommit.slice(0, 10)}…
                </code>
              </>
            ) : (
              " "
            )}
            {counterCommitted && (
              <span className="ml-1 text-[var(--success)]">
                · counterparty committed ✓
              </span>
            )}
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Commit terms on-chain?"
        description="This publishes your hash commitment to the blockchain. This action is irreversible — you cannot change the committed terms afterward, only retract your own commitment during the commit phase."
        confirmLabel="Commit now"
        variant="warning"
        busy={isCommittingConfirm}
        onConfirm={async () => {
          setIsCommittingConfirm(true);
          await handleCommit();
          setIsCommittingConfirm(false);
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </section>
  );
}