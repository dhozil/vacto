"use client";

import { useState } from "react";
import { ChevronDown, Terminal, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { P2PState } from "@/lib/contracts/types";

export function StateTerminal({ state }: { state: P2PState }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(state, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="brand-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">On-chain state</span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 animate-fade-in">
          <div className="terminal overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 font-mono text-[11px] text-[#8ba3b8]">
                  get_state()
                </span>
              </div>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#8ba3b8] transition-colors hover:bg-white/10 hover:text-white"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-[#cde3f5]">
              {json}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}