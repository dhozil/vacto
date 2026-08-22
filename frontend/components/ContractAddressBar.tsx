"use client";

import { useState, useEffect } from "react";
import { FileSignature, ArrowRight, Loader2, History, X, RotateCcw } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getContractAddress } from "@/lib/genlayer/client";
import { isValidEthereumAddress, normalizeAddress } from "@/lib/contracts/address";
import { safeStorage } from "@/lib/utils/safeStorage";
import {
  getDeployedContracts,
  removeDeployedContract,
  type DeployedContract,
} from "@/lib/contracts/myContracts";

const KEY = "p2p_contract_address";
const HISTORY_KEY = "p2p_contract_history";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ContractAddressBar({ value, onChange }: Props) {
  const envAddress = getContractAddress();
  const [draft, setDraft] = useState(value || envAddress);
  const [busy, setBusy] = useState(false);
  const [validateError, setValidateError] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [deployed, setDeployed] = useState<DeployedContract[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const stored = safeStorage.get(KEY);
    setDraft(stored || envAddress);
    const saved = safeStorage.get(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setDeployed(getDeployedContracts());
  }, [envAddress]);

  const handleReset = () => {
    safeStorage.remove(KEY);
    setDraft(envAddress || "");
    setValidateError("");
    onChange("");
  };

  const addToHistory = (addr: string) => {
    if (!addr) return;
    const clean = addr.trim().toLowerCase();
    const updated = [clean, ...history.filter((h) => h !== clean)].slice(0, 10);
    setHistory(updated);
    safeStorage.set(HISTORY_KEY, JSON.stringify(updated));
  };

  const removeFromHistory = (addr: string) => {
    const updated = history.filter((h) => h !== addr);
    setHistory(updated);
    safeStorage.set(HISTORY_KEY, JSON.stringify(updated));
  };

  const apply = (addr: string) => {
    const clean = addr.trim();
    if (!isValidEthereumAddress(clean)) {
      setValidateError("Enter a valid 0x address (42 characters).");
      return;
    }
    setValidateError("");
    if (normalizeAddress(clean) === envAddress && envAddress) {
      safeStorage.remove(KEY);
    } else if (clean) {
      safeStorage.set(KEY, clean);
      addToHistory(clean);
    }
    setBusy(true);
    onChange(clean);
    requestAnimationFrame(() => setTimeout(() => setBusy(false), 350));
  };

  return (
    <section className="brand-card p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-[var(--accent)]" />
            <p className="section-label">Contract of record</p>
          </div>
          <div className="relative">
            <Input
              className="font-mono h-10 pr-10"
              placeholder="0x… deployed Vacto contract address"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (validateError) setValidateError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && apply(draft)}
              aria-label="Contract address"
              aria-invalid={!!validateError || (draft.trim().length > 0 && !isValidEthereumAddress(draft))}
            />
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer rounded hover:bg-muted transition-colors"
                title="Recent contracts"
                aria-label="Toggle recent contracts"
              >
                <History className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {draft.trim().length > 0 && !isValidEthereumAddress(draft) && (
            <p
              className="text-xs text-[var(--destructive)]"
              role="alert"
            >
              Address must be a valid 0x address (42 characters).
            </p>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Only the address of a <b>Vacto contract</b> (deployed from{" "}
            <code className="font-mono text-foreground">
              contracts/private_p2p_contract.py
            </code>
            ) loads here. The app verifies it exposes the Pacto{" "}
            <code className="font-mono">get_state</code> schema — other contracts
            will show a clear error.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:self-center">
          <Button
            variant="default"
            className="sm:h-10"
            onClick={() => apply(draft)}
            disabled={
              busy ||
              !draft.trim() ||
              (draft.trim().length > 0 && !isValidEthereumAddress(draft))
            }
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Load contract
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={busy || (!value && !draft)}
            title="Unload this contract and clear the saved address"
            className="sm:h-10 px-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showHistory && (deployed.length > 0 || history.length > 0) && (
        <div className="mt-3 space-y-2">
          {deployed.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Your deployments:
              </p>
              <div className="flex flex-wrap gap-2">
                {deployed.map((d) => (
                  <div
                    key={d.address}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-xs"
                  >
                    <button
                      onClick={() => {
                        setDraft(d.address);
                        apply(d.address);
                        setShowHistory(false);
                      }}
                      title={d.purpose}
                      className="font-mono cursor-pointer hover:text-foreground transition-colors"
                    >
                      {d.address.slice(0, 6)}...{d.address.slice(-4)}
                    </button>
                    {d.purpose && (
                      <span className="ml-1 truncate max-w-[140px] text-muted-foreground">
                        · {d.purpose}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        removeDeployedContract(d.address);
                        setDeployed(getDeployedContracts());
                      }}
                      aria-label="Forget this deployment"
                      className="p-0.5 cursor-pointer hover:text-[var(--destructive)] transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {history.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">Recent contracts:</p>
              <div className="flex flex-wrap gap-2">
                {history.map((addr) => (
                  <div
                    key={addr}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/50 text-xs"
                  >
                    <button
                      onClick={() => {
                        setDraft(addr);
                        apply(addr);
                        setShowHistory(false);
                      }}
                      className="font-mono cursor-pointer hover:text-foreground transition-colors"
                    >
                      {addr.slice(0, 6)}...{addr.slice(-4)}
                    </button>
                    <button
                      onClick={() => removeFromHistory(addr)}
                      className="p-0.5 cursor-pointer hover:text-[var(--destructive)] transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {envAddress && !value ? (
        <p className="text-xs text-muted-foreground mt-3">
          Using <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code>{" "}
          from environment:{" "}
          <code className="font-mono text-foreground">{storedAddr(envAddress)}</code>
        </p>
      ) : null}
      {!envAddress && !value ? (
        <p className="text-xs text-muted-foreground mt-3">
          Deploy{" "}
          <code className="font-mono">contracts/private_p2p_contract.py</code>{" "}
          with <code className="font-mono">genlayer deploy</code>, then paste its
          address above.
        </p>
      ) : null}
    </section>
  );
}

function storedAddr(a: string): string {
  return a.trim().toLowerCase();
}