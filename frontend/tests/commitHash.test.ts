import { describe, it, expect } from "vitest";
import {
  computeCommitHash,
  computeClauseHash,
  computeClauseHashes,
  splitClauses,
  isSaltStrong,
  generateSalt,
  MIN_SALT_LENGTH,
  CLAUSE_SEPARATOR,
} from "../lib/contracts/commitHash";

const SALT = "A".repeat(16);
const TERMS = "Deliver 100 widgets by March 1st for 50 GEN";

describe("computeCommitHash", () => {
  it("matches the on-chain HMAC-SHA256 (keyed by salt)", async () => {
    // Known-answer vector computed with hmac.new(salt, terms, sha256).
    const hash = await computeCommitHash(TERMS, SALT);
    expect(hash).toBe("97c3b2c8dffad2f11fea3019fb875bf908156816561d61e5577ff09b1ad59445");
  });

  it("is deterministic for identical terms + salt", async () => {
    const a = await computeCommitHash(TERMS, SALT);
    const b = await computeCommitHash(TERMS, SALT);
    expect(a).toBe(b);
  });

  it("changes when the terms change", async () => {
    const a = await computeCommitHash(TERMS, SALT);
    const b = await computeCommitHash("Different terms", SALT);
    expect(a).not.toBe(b);
  });
});

describe("computeClauseHash", () => {
  it("matches the per-clause HMAC keyed by salt#index", async () => {
    const h = await computeClauseHash(TERMS, SALT, 0);
    expect(h).toBe("cc8a1004c0b44a669c41c9aa2a8237e5449e94a153eb61985f9ecc1bedbf35f1");
  });

  it("domain-separates by index", async () => {
    const h0 = await computeClauseHash(TERMS, SALT, 0);
    const h1 = await computeClauseHash(TERMS, SALT, 1);
    expect(h0).not.toBe(h1);
  });
});

describe("splitClauses", () => {
  it("splits on the canonical separator and trims", () => {
    const terms = ["Clause A", "Clause B", "Clause C"].join(CLAUSE_SEPARATOR);
    expect(splitClauses(terms)).toEqual(["Clause A", "Clause B", "Clause C"]);
  });

  it("drops empty segments", () => {
    const terms = `A${CLAUSE_SEPARATOR}${CLAUSE_SEPARATOR}B`;
    expect(splitClauses(terms)).toEqual(["A", "B"]);
  });
});

describe("computeClauseHashes", () => {
  it("returns one digest per clause in order", async () => {
    const clauses = ["One", "Two", "Three"];
    const terms = clauses.join(CLAUSE_SEPARATOR);
    const hashes = await computeClauseHashes(terms, SALT);
    expect(hashes).toHaveLength(3);
    expect(hashes[0]).toBe(await computeClauseHash("One", SALT, 0));
    expect(hashes[2]).toBe(await computeClauseHash("Three", SALT, 2));
  });
});

describe("salt validation", () => {
  it("accepts salts at/above MIN_SALT_LENGTH", () => {
    expect(MIN_SALT_LENGTH).toBe(16);
    expect(isSaltStrong("x".repeat(16))).toBe(true);
    expect(isSaltStrong("x".repeat(32))).toBe(true);
  });

  it("rejects short salts", () => {
    expect(isSaltStrong("short")).toBe(false);
    expect(isSaltStrong("x".repeat(15))).toBe(false);
  });

  it("generates a salt long enough and unique", () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a.length).toBeGreaterThanOrEqual(MIN_SALT_LENGTH);
    expect(a).not.toBe(b);
  });
});