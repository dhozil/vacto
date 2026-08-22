"use client";

import { useState, useEffect } from "react";
import { useContractState, useAmIParty } from "@/lib/hooks/usePrivateP2P";
import { useContractNotifications } from "@/lib/hooks/useContractNotifications";
import { useWallet } from "@/lib/genlayer/wallet";
import { getContractAddress } from "@/lib/genlayer/client";
import { useDemo, demoToP2PState, DEMO_PARTY_A, DEMO_PARTY_B } from "@/lib/demo/DemoProvider";
import { Navbar } from "@/components/Navbar";
import { ContractAddressBar } from "@/components/ContractAddressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ContractTimeline } from "@/components/ContractTimeline";
import { CommitPanel } from "@/components/CommitPanel";
import { ActionsPanel } from "@/components/ActionsPanel";
import { DisputePanel } from "@/components/DisputePanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { CaseOverview } from "@/components/CaseOverview";
import { PrivacyPanel } from "@/components/PrivacyPanel";
import { StateTerminal } from "@/components/StateTerminal";
import { AddressDisplay } from "@/components/AddressDisplay";
import { DeployWizard } from "@/components/DeployWizard";
import { AuditTrail } from "@/components/AuditTrail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Loader2, Landmark, Rocket, Play, StopCircle, RefreshCw, Users } from "lucide-react";
import { safeStorage } from "@/lib/utils/safeStorage";

const STORAGE_KEY = "p2p_contract_address";

export default function Home() {
  const { address, isConnected } = useWallet();
  const [contractAddress, setContractAddress] = useState("");
  const [showDeployWizard, setShowDeployWizard] = useState(false);
  const demo = useDemo();

  useEffect(() => {
    if (!demo.isActive) {
      setContractAddress(safeStorage.get(STORAGE_KEY) || getContractAddress());
    }
  }, [demo.isActive]);

  const { data: realState, isLoading, isError } = useContractState(
    demo.isActive ? undefined : contractAddress
  );

  const state = demo.isActive && demo.state ? demoToP2PState(demo.state) : realState;
  const myRole = demo.isActive
    ? demo.party
    : useAmIParty(state, address);

  useContractNotifications(
    demo.isActive ? null : (realState ?? undefined)
  );

  const handleAddressChange = (addr: string) => setContractAddress(addr);

  const handleDeployed = (address: string) => {
    setContractAddress(address);
    safeStorage.set(STORAGE_KEY, address);
  };

  const hasState = !!state;
  const showStatusBadge = hasState && !!state!.status;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
        {/* Hero */}
        <header className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            <Landmark className="h-3.5 w-3.5" />
            Vacto · Private agreements on GenLayer
          </div>
          <h2 className="max-w-2xl font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-balance text-foreground">
            Two-party agreements engineered to{" "}
            <span className="italic text-[var(--primary)]">stay private</span>{" "}
            until a dispute arises.
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Terms are agreed off-chain and committed as a SHA-256 digest. While both
            parties cooperate, nothing sensitive is ever stored on-chain. If a dispute
            breaks out, the terms are revealed and an AI jury arbitrates — fairly and
            on the record.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="px-3 py-1">
              <Lock className="h-3 w-3" /> Commit → digest only
            </Badge>
            <Badge variant="accent" className="px-3 py-1">
              <Unlock className="h-3 w-3" /> Reveal → only on dispute
            </Badge>
            <Badge variant="blue" className="px-3 py-1">
              AI jury arbitration on GenLayer
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {isConnected && !demo.isActive && (
              <Button
                variant="gradient"
                onClick={() => setShowDeployWizard(true)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy New Contract
              </Button>
            )}
            {!demo.isActive ? (
              <Button
                variant="outline"
                onClick={demo.startDemo}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Demo
              </Button>
            ) : (
              <>
                <Badge variant="accent" className="px-3 py-1">
                  <Users className="h-3 w-3 mr-1" />
                  Demo Mode — Party {demo.party}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={demo.switchParty}
                >
                  Switch to Party {demo.party === "A" ? "B" : "A"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={demo.resetDemo}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={demo.endDemo}
                >
                  <StopCircle className="h-3 w-3 mr-1" />
                  End Demo
                </Button>
              </>
            )}
          </div>
          {demo.isActive && demo.state && (
            <p className="max-w-2xl rounded-lg border border-dashed border-border bg-muted/30 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Demo walkthrough —</span>{" "}
              both parties use this one browser. As Party {demo.party}: use the
              panel below to act, then hit{" "}
              <span className="font-mono">Switch to Party {demo.party === "A" ? "B" : "A"}</span>{" "}
              to act for the other side. Both parties must commit the{" "}
              <span className="font-semibold">same terms + same salt</span> (paste the
              identical hash) to reach ACTIVE. Then try a private close or raise a
              dispute all the way to the AI verdict.
            </p>
          )}
        </header>

        <ContractAddressBar value={contractAddress} onChange={handleAddressChange} />

        {!hasState ? (
          <section className="brand-card p-10 sm:p-14 text-center space-y-4 animate-fade-in">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Landmark className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            {isLoading ? (
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Opening the dossier…
                </h3>
                <p className="text-sm text-muted-foreground">
                  Reading the contract state from GenLayer.
                </p>
              </div>
            ) : isError ? (
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Could not load the contract
                </h3>
                <p className="text-sm text-muted-foreground">
                  Check the address and that you are connected to the GenLayer network.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  No contract is loaded yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Paste a deployed contract address above to begin a private agreement
                  — or deploy{" "}
                  <code className="font-mono">contracts/private_p2p_contract.py</code>{" "}
                  with <code className="font-mono">genlayer deploy</code>.
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
              {/* Main column */}
              <div className="space-y-8">
                {/* Case docket header */}
                <section className="brand-card p-5 sm:p-6 animate-rise">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="section-label">Docket</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-lg font-semibold text-foreground">
                          Case state
                        </h3>
                        {showStatusBadge && (
                          <span aria-live="polite">
                            <StatusBadge status={state!.status} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                          Party A: <AddressDisplay address={state!.party_a} showCopy />
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Party B: <AddressDisplay address={state!.party_b} showCopy />
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      {!isConnected ? (
                        <p className="text-xs text-muted-foreground">
                          Connect a wallet to act as a party.
                        </p>
                      ) : myRole ? (
                        <Badge variant="accent">You are Party {myRole}</Badge>
                      ) : (
                        <Badge variant="secondary">Observer</Badge>
                      )}
                      {isError && (
                        <p className="text-xs text-[var(--destructive)]">
                          Last state fetch failed — showing cached data.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-5">
                    <ContractTimeline status={state!.status} />
                  </div>
                </section>

                <CommitPanel
                  state={state}
                  myRole={myRole}
                  demoCommitTerms={demo.isActive ? demo.commitTerms : undefined}
                  demoCommitIdentity={
                    demo.isActive ? demo.commitIdentity : undefined
                  }
                />
                <ActionsPanel
                  state={state}
                  myRole={myRole}
                  demoRequestCompletion={
                    demo.isActive ? demo.requestCompletion : undefined
                  }
                  demoRequestDispute={
                    demo.isActive ? demo.requestDispute : undefined
                  }
                  demoCommitClauses={
                    demo.isActive ? demo.commitClauses : undefined
                  }
                  demoRetractCommit={
                    demo.isActive ? demo.retractCommit : undefined
                  }
                  demoResetCommits={
                    demo.isActive ? demo.resetCommits : undefined
                  }
                  demoRetractCompletion={
                    demo.isActive ? demo.retractCompletion : undefined
                  }
                  demoWithdrawDisputeRequest={
                    demo.isActive ? demo.withdrawDisputeRequest : undefined
                  }
                />
                <DisputePanel
                  state={state}
                  myRole={myRole}
                  demoOpenDispute={
                    demo.isActive ? demo.openDispute : undefined
                  }
                  demoSubmitStatement={
                    demo.isActive ? demo.submitStatement : undefined
                  }
                  demoRequestClarification={
                    demo.isActive ? demo.requestClarification : undefined
                  }
                  demoResolveDispute={
                    demo.isActive ? demo.resolveDispute : undefined
                  }
                  demoSubmitEvidence={
                    demo.isActive ? demo.submitEvidence : undefined
                  }
                />
              </div>

              {/* Right rail */}
              <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                <CaseOverview state={state} myRole={myRole} />
                <PrivacyPanel state={state} />
                <StateTerminal state={state} />
                {!demo.isActive && (
                  <AuditTrail contractAddress={contractAddress} />
                )}
              </aside>
            </div>

            <ResultsPanel state={state} />
          </>
        )}
      </main>

      <footer className="border-t border-border/70">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Vacto · committed confidentiality, AI-arbitrated.</span>
          <Button
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => window.open("https://docs.genlayer.org", "_blank")}
          >
            GenLayer Docs
          </Button>
        </div>
      </footer>

      <DeployWizard
        isOpen={showDeployWizard}
        onClose={() => setShowDeployWizard(false)}
        onDeployed={handleDeployed}
      />
    </div>
  );
}