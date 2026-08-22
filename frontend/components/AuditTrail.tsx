"use client";

import { useEffect, useState } from "react";
import { History, Trash2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import {
  getTransactionHistory,
  clearTransactionHistory,
  functionLabel,
  type TxRecord,
} from "@/lib/contracts/txLog";

interface AuditTrailProps {
  contractAddress: string;
}

export function AuditTrail({ contractAddress }: AuditTrailProps) {
  const [records, setRecords] = useState<TxRecord[]>([]);

  useEffect(() => {
    if (!contractAddress) return;
    setRecords(getTransactionHistory(contractAddress));
  }, [contractAddress]);

  if (!contractAddress || records.length === 0) return null;

  const handleClear = () => {
    clearTransactionHistory(contractAddress);
    setRecords([]);
  };

  const explorerUrl = `https://explorer-studio.genlayer.com/tx/`;

  return (
    <div className="brand-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--accent)]" />
          <p className="section-label">Local audit trail</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <ol className="mt-3 space-y-2.5">
        {records.map((r, i) => (
          <li key={`${r.hash}-${i}`} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {functionLabel(r.functionName)}
              </span>
              <span className="text-muted-foreground">
                {new Date(r.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="flex-1 truncate font-mono text-muted-foreground">
                {r.hash}
              </code>
              {r.hash.startsWith("0x") && (
                <a
                  href={`${explorerUrl}${r.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`View transaction ${r.hash} on explorer`}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
        Actions recorded locally in this browser only. For the authoritative
        record, inspect the contract on the GenLayer explorer.
      </p>
    </div>
  );
}

export default AuditTrail;