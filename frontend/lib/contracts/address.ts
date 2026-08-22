/**
 * Address validation helpers shared across the app.
 */

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function isAddressEqual(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b);
}