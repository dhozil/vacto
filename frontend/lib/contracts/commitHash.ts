"use client";

/**
 * Client-side helpers for the keyed commit/reveal scheme.
 *
 * The commit is HMAC-SHA256 keyed by the salt — computed off-chain so only
 * the digest ever touches the blockchain. It must match the contract's
 * `hmac.new(salt, terms, hashlib.sha256).hexdigest()` exactly (headless=True
 * plain HMAC, no extra key derivation). The salt is a high-entropy secret
 * shared off-chain, so an on-chain observer cannot brute-force the terms
 * from the digest (anti-correlation).
 *
 * Clause digests used by the partial-reveal flow are HMAC-SHA256 keyed by
 * f"{salt}#{index}", matching `_clause_hash` in the contract.
 */

export const MIN_SALT_LENGTH = 16;
export const CLAUSE_SEPARATOR = "\n---\n";

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const keyData = new TextEncoder().encode(key);
  const msgData = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return bufToHex(signature);
}

export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isSaltStrong(salt: string): boolean {
  return salt.length >= MIN_SALT_LENGTH;
}

export function computeCommitHash(terms: string, salt: string): Promise<string> {
  return hmacSha256Hex(salt, terms);
}

/** Canonical clause split: split on the clause separator, trim, drop empties. */
export function splitClauses(terms: string): string[] {
  return terms
    .split(CLAUSE_SEPARATOR)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** Per-clause digest for a given split index (matches contract _clause_hash). */
export function computeClauseHash(
  clause: string,
  salt: string,
  index: number
): Promise<string> {
  return hmacSha256Hex(`${salt}#${index}`, clause);
}

export async function computeClauseHashes(
  terms: string,
  salt: string
): Promise<string[]> {
  const clauses = splitClauses(terms);
  return Promise.all(clauses.map((c, i) => computeClauseHash(c, salt, i)));
}

/** Plain SHA-256 hex digest of text (public identity commitment). */
export async function sha256HexText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(buf);
}