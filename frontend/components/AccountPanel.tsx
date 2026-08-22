"use client";

import { useWallet } from "@/lib/genlayer/WalletProvider";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { User, LogOut, Loader2 } from "lucide-react";

export function AccountPanel() {
  const {
    address,
    isConnected,
    isWalletInstalled,
    walletName,
    isLoading,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        {!isWalletInstalled && (
          <Badge variant="destructive" className="hidden sm:inline-flex">
            No wallet detected
          </Badge>
        )}
        <Button variant="default" onClick={connectWallet} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <User className="w-4 h-4" />
          )}
          {isLoading ? "Connecting…" : "Connect wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
        <AddressDisplay address={address} maxLength={12} showCopy />
      </div>
      <span className="hidden md:inline text-xs text-muted-foreground">
        {walletName}
      </span>
      <Button variant="ghost" size="sm" onClick={disconnectWallet}>
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Disconnect</span>
      </Button>
    </div>
  );
}