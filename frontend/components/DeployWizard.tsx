"use client";

import { useState, useEffect } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  Rocket,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  X,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useWallet } from "@/lib/genlayer/wallet";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { addDeployedContract } from "@/lib/contracts/myContracts";
import { success, error as toastError } from "@/lib/utils/toast";

interface DeployWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployed: (address: string) => void;
}

type Step = "configure" | "review" | "deploying" | "done";

export function DeployWizard({ isOpen, onClose, onDeployed }: DeployWizardProps) {
  const { address, isConnected } = useWallet();
  const [step, setStep] = useState<Step>("configure");
  const [partyB, setPartyB] = useState("");
  const [purpose, setPurpose] = useState("");
  const [refLinks, setRefLinks] = useState("");
  const [deployedAddress, setDeployedAddress] = useState("");
  const [deployTxHash, setDeployTxHash] = useState("");
  const [error, setError] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("configure");
      setPartyB("");
      setPurpose("");
      setRefLinks("");
      setDeployedAddress("");
      setError("");
      setIsDeploying(false);
    }
  }, [isOpen]);

  const isValidAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr);
  const parseLinks = (raw: string): string[] =>
    raw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//.test(u))
      .slice(0, 3);
  const links = parseLinks(refLinks);
  const canProceed =
    step === "configure" &&
    isValidAddress(partyB) &&
    partyB.toLowerCase() !== address?.toLowerCase() &&
    purpose.trim().length >= 3;

  const handleDeploy = async () => {
    if (!address || !partyB || !purpose.trim()) return;

    setStep("deploying");
    setIsDeploying(true);
    setError("");

    try {
      const client = createClient({
        chain: studionet,
        account: address as `0x${string}`,
      });

      const contractCode = await fetch(
        "/api/contract"
      ).then((r) => r.text()).catch(() => {
        throw new Error("Could not load contract code");
      });

      const txHash = await client.deployContract({
        code: new TextEncoder().encode(contractCode),
        args: [address, partyB],
      });
      setDeployTxHash(String(txHash ?? ""));

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash as any,
        status: "ACCEPTED" as any,
        retries: 200,
        interval: 5000,
      });

      // GenLayer returns the created contract address in several receipt
      // shapes depending on SDK/network; accept any of them (and never
      // mis-read a non-address field).
      const raw =
        (receipt as any).contractAddress ??
        (receipt as any).recipient ??
        (receipt as any).to ??
        (receipt as any).data?.contract_address ??
        (receipt as any).txDataDecoded?.contractAddress;
      const contractAddr =
        typeof raw === "string" && /^0x[a-fA-F0-9]{40}$/.test(raw)
          ? raw
          : "";

      if (!contractAddr) {
        throw new Error("Deployment succeeded but no contract address returned");
      }

      setDeployedAddress(contractAddr);
      // Remember this deployment (with its purpose) so it can be reloaded
      // later even if the user forgets to copy the address.
      addDeployedContract({
        address: contractAddr,
        purpose: purpose.trim(),
        links,
        deployedAt: new Date().toISOString(),
      });
      setStep("done");
      onDeployed(contractAddr);
    } catch (err: any) {
      console.error("Deploy error:", err);
      setError(err?.message || "Deployment failed. Please try again.");
      setStep("configure");
    } finally {
      setIsDeploying(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard
      .writeText(deployedAddress)
      .then(() => success("Contract address copied"))
      .catch(() => toastError("Failed to copy address"));
  };

  const close = () => {
    if (step !== "deploying") onClose();
  };

  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, close);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deploy-wizard-title"
        className="relative z-50 w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-lg"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-[var(--accent)]" />
            <h2 id="deploy-wizard-title" className="font-serif text-lg font-semibold">Deploy Contract</h2>
          </div>
          <button
            onClick={close}
            className="p-1 cursor-pointer rounded-md hover:bg-muted transition-colors"
            aria-label="Close deploy wizard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {step === "configure" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deploy a new Vacto agreement. You will be Party A, and you
                need to specify Party B&apos;s address.
              </p>

              <div className="space-y-2">
                <Label htmlFor="partyA">Party A (You)</Label>
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/50">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm truncate">
                    {isConnected ? address : "Not connected"}
                  </span>
                  {isConnected && (
                    <Badge variant="success" className="ml-auto text-[10px]">
                      Connected
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partyB">Party B Address</Label>
                <Input
                  id="partyB"
                  className="font-mono"
                  value={partyB}
                  onChange={(e) => setPartyB(e.target.value)}
                  placeholder="0x..."
                />
                {partyB && !isValidAddress(partyB) && (
                  <p className="text-xs text-[var(--destructive)]">
                    Invalid Ethereum address format
                  </p>
                )}
                {partyB &&
                  isValidAddress(partyB) &&
                  partyB.toLowerCase() === address?.toLowerCase() && (
                    <p className="text-xs text-[var(--destructive)]">
                      Party B cannot be the same as Party A
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">
                  What is this contract for?{" "}
                  <span className="text-[var(--destructive)]">*</span>
                </Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={2}
                  placeholder="e.g. Freelance engagement — I build the website, Client pays 2000 GEN on acceptance"
                />
                <p className="text-[11px] text-muted-foreground">
                  State the agreement you are formalizing. This purpose is stored
                  with the deployment so both parties know what the contract is
                  for.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refLinks">Reference / source URLs (optional)</Label>
                <Textarea
                  id="refLinks"
                  value={refLinks}
                  onChange={(e) => setRefLinks(e.target.value)}
                  rows={2}
                  placeholder="https://... (up to 3, comma or newline separated)"
                  className="font-mono text-xs"
                />
                {refLinks.trim() && links.length === 0 && (
                  <p className="text-[11px] text-[var(--warning)]">
                    No valid http(s) URLs recognized — add at least one or leave empty.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20">
                  <p className="text-sm text-[var(--destructive)]">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => setStep("review")} disabled={!canProceed}>
                  Review
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the deployment details before confirming.
              </p>

              <div className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contract</span>
                  <span className="font-mono">private_p2p_contract.py</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Party A</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {address}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Party B</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {partyB}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">
                    What it is for
                  </span>
                  <span className="text-foreground">{purpose.trim()}</span>
                  {links.length > 0 && (
                    <div className="pt-1 space-y-0.5">
                      <span className="text-muted-foreground">
                        Reference URLs
                      </span>
                      {links.map((u) => (
                        <div key={u} className="font-mono text-xs break-all text-foreground">
                          {u}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("configure")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleDeploy}
                  disabled={isDeploying}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deploying…
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-1" />
                      Deploy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "deploying" && (
            <div className="space-y-4 text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-[var(--accent)] mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold">
                  Deploying contract…
                </h3>
                <p className="text-sm text-muted-foreground">
                  This may take 30–60 seconds. Please wait.
                </p>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--success)]/10">
                <Check className="h-6 w-6 text-[var(--success)]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold">
                  Contract deployed!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your Vacto agreement is now live on GenLayer.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                <span className="font-mono text-sm truncate">
                  {deployedAddress}
                </span>
                <button
                  onClick={copyAddress}
                  className="p-1 cursor-pointer rounded hover:bg-muted transition-colors"
                  aria-label="Copy contract address"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={`https://explorer-studio.genlayer.com/address/${deployedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 cursor-pointer rounded hover:bg-muted transition-colors"
                  aria-label="Open contract on the explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {deployTxHash && (
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${deployTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View deployment transaction
                </a>
              )}

              <div className="flex justify-center gap-2 pt-2">
                <Button onClick={close}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
