"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  isWalletInstalled,
  connectWalletProvider,
  getAccounts,
  getCurrentChainId,
  isOnGenLayerNetwork,
  getEthereumProvider,
  getWalletProviderName,
  GENLAYER_CHAIN_ID,
} from "./client";
import { error, userRejected } from "../utils/toast";

const DISCONNECT_FLAG = "wallet_disconnected";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isWalletInstalled: boolean;
  walletName: string;
  isOnCorrectNetwork: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isWalletInstalled: false,
    walletName: "Web3 wallet",
    isOnCorrectNetwork: false,
  });

  useEffect(() => {
    const initWallet = async () => {
      const installed = isWalletInstalled();
      if (!installed) {
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isWalletInstalled: false,
          walletName: "Web3 wallet",
          isOnCorrectNetwork: false,
        });
        return;
      }

      if (typeof window !== "undefined") {
        const wasDisconnected =
          localStorage.getItem(DISCONNECT_FLAG) === "true";
        if (wasDisconnected) {
          setState({
            address: null,
            chainId: null,
            isConnected: false,
            isLoading: false,
            isWalletInstalled: true,
            walletName: getWalletProviderName(),
            isOnCorrectNetwork: false,
          });
          return;
        }
      }

      try {
        const accounts = await getAccounts();
        const chainId = await getCurrentChainId();
        const correctNetwork = await isOnGenLayerNetwork();
        setState({
          address: accounts[0] || null,
          chainId,
          isConnected: accounts.length > 0,
          isLoading: false,
          isWalletInstalled: true,
          walletName: getWalletProviderName(),
          isOnCorrectNetwork: correctNetwork,
        });
      } catch (err) {
        console.error("Error initializing wallet:", err);
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isWalletInstalled: true,
          walletName: getWalletProviderName(),
          isOnCorrectNetwork: false,
        });
      }
    };

    initWallet();
  }, []);

  useEffect(() => {
    const provider = getEthereumProvider();
    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();
      if (accounts.length > 0 && typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }
      setState((prev) => ({
        ...prev,
        address: accounts[0] || null,
        chainId,
        isConnected: accounts.length > 0,
        isOnCorrectNetwork: correctNetwork,
      }));
    };

    const handleChainChanged = async (chainId: string) => {
      const correctNetwork = parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
      const accounts = await getAccounts();
      setState((prev) => ({
        ...prev,
        chainId,
        address: accounts[0] || null,
        isConnected: accounts.length > 0,
        isOnCorrectNetwork: correctNetwork,
      }));
    };

    const handleDisconnect = () => {
      setState((prev) => ({
        ...prev,
        address: null,
        isConnected: false,
      }));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const address = await connectWalletProvider();
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }
      setState({
        address,
        chainId,
        isConnected: true,
        isLoading: false,
        isWalletInstalled: true,
        walletName: getWalletProviderName(),
        isOnCorrectNetwork: correctNetwork,
      });
      return address;
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
      if (err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else if (err.message?.includes("No wallet is installed")) {
        error("No wallet found", {
          description:
            "Please install a Web3 wallet in your browser to connect.",
          action: {
            label: "Get a wallet",
            onClick: () =>
              window.open("https://www.rabby.io/", "_blank"),
          },
        });
      } else {
        error("Failed to connect wallet", {
          description:
            err.message || "Please check your wallet and try again.",
        });
      }
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECT_FLAG, "true");
    }
    setState((prev) => ({
      ...prev,
      address: null,
      isConnected: false,
    }));
  }, []);

  const value: WalletContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}