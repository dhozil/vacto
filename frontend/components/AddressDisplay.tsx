"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { formatAddress } from "@/lib/genlayer/wallet";
import { success, error } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";

interface AddressDisplayProps {
  address: string | null;
  maxLength?: number;
  className?: string;
  showCopy?: boolean;
}

export function AddressDisplay({
  address,
  maxLength = 12,
  className = "",
  showCopy = false,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!address) {
    return <span className={className}>—</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success("Address copied!");
    } catch (err) {
      console.error("Failed to copy address:", err);
      error("Failed to copy address", { description: "Please copy manually." });
    }
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={address}
    >
      <span className="font-mono text-[13px]">{formatAddress(address, maxLength)}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="opacity-50 hover:opacity-100 transition-opacity p-0.5 hover:bg-primary/10 rounded"
          aria-label="Copy address"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[var(--success)]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </span>
  );
}