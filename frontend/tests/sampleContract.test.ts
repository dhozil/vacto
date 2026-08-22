import { describe, it, expect } from "vitest";
import {
  PROFESSIONAL_SAMPLE_TERMS,
  loadProfessionalSample,
  clauseCount,
} from "../lib/contracts/sampleContract";
import { CLAUSE_SEPARATOR, MIN_SALT_LENGTH, splitClauses } from "../lib/contracts/commitHash";

describe("professional sample contract", () => {
  it("is a professional multi-clause legal agreement", () => {
    expect(PROFESSIONAL_SAMPLE_TERMS).toContain("AGREEMENT AND PARTIES");
    expect(PROFESSIONAL_SAMPLE_TERMS).toContain("CONFIDENTIALITY");
    expect(PROFESSIONAL_SAMPLE_TERMS).toContain("LIMITATION OF LIABILITY");
    expect(PROFESSIONAL_SAMPLE_TERMS).toContain("GOVERNING LAW AND DISPUTE RESOLUTION");
    expect(clauseCount(PROFESSIONAL_SAMPLE_TERMS)).toBeGreaterThanOrEqual(8);
  });

  it("fits within the contract's 4096-char terms limit", () => {
    expect(PROFESSIONAL_SAMPLE_TERMS.length).toBeLessThanOrEqual(4096);
  });

  it("loads with a fresh salt above the minimum length", () => {
    const { terms, salt } = loadProfessionalSample(true);
    expect(terms).toBe(PROFESSIONAL_SAMPLE_TERMS);
    expect(salt.length).toBeGreaterThanOrEqual(MIN_SALT_LENGTH);
  });

  it("produces clause-separated terms usable for partial reveal", () => {
    const clauses = splitClauses(PROFESSIONAL_SAMPLE_TERMS);
    expect(clauses.length).toBe(clauseCount(PROFESSIONAL_SAMPLE_TERMS));
    expect(PROFESSIONAL_SAMPLE_TERMS.includes(CLAUSE_SEPARATOR)).toBe(true);
  });
});