"use client";

import { useState } from "react";
import { Fingerprint, Send } from "lucide-react";
import type { P2PState } from "@/lib/contracts/types";
import { computeClauseHashes } from "@/lib/contracts/commitHash";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const MAX_CLAUSE = 4096;

interface ClauseProofsSectionProps {
  state: P2PState;
  myRole: "A" | "B" | null;
  address?: string | null;
  isDemo: boolean;
  isRecording: boolean;
  isRevealing: boolean;
  onRecord: (hashes: string[]) => void;
  onReveal: (index: number, clauseText: string, salt: string) => void;
}

export function ClauseProofsSection({
  state,
  myRole,
  address,
  isDemo,
  isRecording,
  isRevealing,
  onRecord,
  onReveal,
}: ClauseProofsSectionProps) {
  const [proofTerms, setProofTerms] = useState("");
  const [proofSalt, setProofSalt] = useState("");
  const [proofIndex, setProofIndex] = useState("");
  const [proofClause, setProofClause] = useState("");
  const [proofRevealSalt, setProofRevealSalt] = useState("");
  const canAct = isDemo || !!address;

  return (
    <div className="brand-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-5 w-5 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold">Clause proofs</h3>
      </div>

      {state.clause_commits.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Optional: record per-clause digests so either party can later prove
            a single clause — keeping the rest of the terms private. Both
            parties must record the identical digest list.
          </p>
          {myRole && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="proof-terms">Your agreed terms</Label>
                <Textarea
                  id="proof-terms"
                  value={proofTerms}
                  onChange={(e) =>
                    setProofTerms(e.target.value.slice(0, MAX_CLAUSE))
                  }
                  rows={3}
                  maxLength={MAX_CLAUSE}
                  placeholder="Paste the exact terms you committed"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proof-salt">Your salt</Label>
                <Input
                  id="proof-salt"
                  value={proofSalt}
                  onChange={(e) => setProofSalt(e.target.value)}
                  className="font-mono"
                  placeholder="The salt you used when committing"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!canAct || isRecording || !proofTerms || !proofSalt}
                onClick={async () => {
                  const hashes = await computeClauseHashes(
                    proofTerms,
                    proofSalt
                  );
                  if (hashes.length === 0) return;
                  onRecord(hashes);
                }}
              >
                {isRecording ? "Recording…" : "Record my clause digests"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {state.clause_commits.length} clause commitments recorded (
            {Object.keys(state.revealed_clauses ?? {}).length} revealed). Prove
            a clause below by index — the text must hash to the committed
            digest.
          </p>
          {myRole && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="proof-index">Index</Label>
                <Input
                  id="proof-index"
                  value={proofIndex}
                  onChange={(e) =>
                    setProofIndex(e.target.value.replace(/\D/g, ""))
                  }
                  className="font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="proof-reveal-salt">Salt</Label>
                <Input
                  id="proof-reveal-salt"
                  value={proofRevealSalt}
                  onChange={(e) => setProofRevealSalt(e.target.value)}
                  className="font-mono"
                  placeholder="The salt used when committing"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="proof-clause">Clause text</Label>
                <Textarea
                  id="proof-clause"
                  value={proofClause}
                  onChange={(e) =>
                    setProofClause(e.target.value.slice(0, MAX_CLAUSE))
                  }
                  rows={2}
                  maxLength={MAX_CLAUSE}
                  placeholder="The exact clause text from your terms"
                />
              </div>
            </div>
          )}
          <Button
            variant="blue"
            size="sm"
            disabled={
              !canAct ||
              !myRole ||
              isRevealing ||
              proofIndex === "" ||
              !proofClause ||
              !proofRevealSalt
            }
            onClick={() =>
              onReveal(
                parseInt(proofIndex, 10),
                proofClause.trim(),
                proofRevealSalt
              )
            }
          >
            <Send className="w-3 h-3" />
            {isRevealing ? "Proving…" : "Prove this clause"}
          </Button>
          {Object.entries(state.revealed_clauses ?? {}).map(([idx, text]) => (
            <blockquote
              key={idx}
              className="rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-3 py-2 text-xs leading-relaxed"
            >
              <span className="font-semibold text-[var(--accent)]">
                Clause {idx}:{" "}
              </span>
              {text}
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClauseProofsSection;