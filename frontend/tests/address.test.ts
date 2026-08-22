import { describe, it, expect } from "vitest";
import {
  isValidEthereumAddress,
  normalizeAddress,
  isAddressEqual,
} from "../lib/contracts/address";

describe("isValidEthereumAddress", () => {
  it("accepts a valid 42-char address", () => {
    expect(isValidEthereumAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
  });

  it("accepts checksummed / uppercase hex", () => {
    expect(isValidEthereumAddress("0xAbCdEf1234567890aBcDeF1234567890AbCdEf12")).toBe(true);
  });

  it("rejects addresses without 0x prefix", () => {
    expect(isValidEthereumAddress("1234567890abcdef1234567890abcdef12345678")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidEthereumAddress("0x123")).toBe(false);
    expect(isValidEthereumAddress("0x1234567890abcdef1234567890abcdef1234567890")).toBe(false);
  });

  it("rejects invalid hex chars", () => {
    expect(isValidEthereumAddress("0xzzzzz67890abcdef1234567890abcdef12345678")).toBe(false);
  });

  it("rejects empty / whitespace-only", () => {
    expect(isValidEthereumAddress("")).toBe(false);
    expect(isValidEthereumAddress("   ")).toBe(false);
  });
});

describe("normalizeAddress", () => {
  it("lowercases and trims", () => {
    expect(normalizeAddress("  0xAbC   ")).toBe("0xabc");
  });
});

describe("isAddressEqual", () => {
  it("compares case-insensitively", () => {
    expect(isAddressEqual("0xAbC", "0xabc")).toBe(true);
    expect(isAddressEqual("0xAbC", "0xdef")).toBe(false);
  });
});