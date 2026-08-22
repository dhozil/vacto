"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { createWalletClient, custom, type WalletClient } from "viem";

export const GENLAYER_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "61999"
);
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16).toUpperCase()}`;

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME || "GenLayer Studio",
  nativeCurrency: {
    name: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL || "GEN",
    symbol: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL || "GEN",
    decimals: 18,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
  ],
  blockExplorerUrls: [],
};

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getStudioUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api"
  );
}

export function getContractAddress(): string {
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
}

/** True when any wallet exposes an EIP-1193 provider on window.ethereum. */
export function isWalletInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum;
}

/** Backwards-compatible alias. */
export function isMetaMaskInstalled(): boolean {
  return isWalletInstalled();
}

/** Best-effort brand detection of the injected wallet. */
export function getWalletProviderName(): string {
  if (typeof window === "undefined" || !window.ethereum) return "Web3 wallet";
  const p = window.ethereum as any;
  if (p.isRabby) return "Rabby";
  if (p.isCoinbaseWallet || p.isCoinbaseExtension) return "Coinbase Wallet";
  if (p.isBraveWallet) return "Brave Wallet";
  if (p.isTrust) return "Trust Wallet";
  if (p.isBitKeep || p.isBitgetWallet) return "Bitget Wallet";
  if (p.isOKExWallet) return "OKX Wallet";
  if (p.isMetaMask) return "MetaMask";
  if (p.isPopup && p.isImToken) return "imToken";
  return "Web3 wallet";
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet is installed");
  try {
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });
    return accounts;
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected the connection request");
    throw new Error(`Failed to connect to wallet: ${error.message}`);
  }
}

export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();
  if (!provider) return [];
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    return accounts;
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
}

export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    return chainId;
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
}

export async function addGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet is installed");
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_NETWORK],
    });
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User rejected adding the network");
    throw new Error(`Failed to add GenLayer network: ${error.message}`);
  }
}

export async function switchToGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet is installed");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      await addGenLayerNetwork();
    } else if (error.code === 4001) {
      throw new Error("User rejected switching the network");
    } else {
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  }
}

export async function isOnGenLayerNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId();
  if (!chainId) return false;
  return parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
}

export async function connectWalletProvider(): Promise<string> {
  if (!isWalletInstalled()) throw new Error("No wallet is installed");
  const accounts = await requestAccounts();
  if (!accounts || accounts.length === 0) throw new Error("No accounts found");
  const onCorrectNetwork = await isOnGenLayerNetwork();
  if (!onCorrectNetwork) await switchToGenLayerNetwork();
  return accounts[0];
}

/** Backwards-compatible alias for any injected EIP-1193 provider. */
export const connectMetaMask = connectWalletProvider;

export function createWalletClientFromProvider(): WalletClient | null {
  const provider = getEthereumProvider();
  if (!provider) return null;
  try {
    return createWalletClient({
      chain: studionet as any,
      transport: custom(provider),
    });
  } catch (error) {
    console.error("Error creating wallet client:", error);
    return null;
  }
}

export function createGenLayerClient(address?: string, endpoint?: string) {
  const config: any = {
    chain: studionet,
  };
  if (address) config.account = address as `0x${string}`;
  if (endpoint) config.endpoint = endpoint;
  try {
    return createClient(config);
  } catch (error) {
    console.error("Error creating GenLayer client:", error);
    return createClient({ chain: studionet, ...(endpoint ? { endpoint } : {}) });
  }
}

export async function getClient() {
  const accounts = await getAccounts();
  return createGenLayerClient(accounts[0]);
}