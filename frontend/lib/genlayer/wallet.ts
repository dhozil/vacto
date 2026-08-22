"use client";

/**
 * Wallet helpers. useWallet / WalletProvider live in WalletProvider.tsx
 * (shared React context); this module re-exports them plus a formatting util.
 */
export { useWallet, WalletProvider } from "./WalletProvider";
export type { WalletState } from "./WalletProvider";

/**
 * Utility function to format an address for display.
 */
export function formatAddress(
  address: string | null,
  maxLength: number = 12
): string {
  if (!address) return "";
  if (address.length <= maxLength) return address;

  const prefixLength = Math.floor((maxLength - 3) / 2);
  const suffixLength = Math.ceil((maxLength - 3) / 2);

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}