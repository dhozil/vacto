import { describe, it, expect, beforeEach } from "vitest";
import {
  logTransaction,
  getTransactionHistory,
  clearTransactionHistory,
  functionLabel,
} from "../lib/contracts/txLog";

const CONTRACT = "0x1234567890abcdef1234567890abcdef12345678";

describe("transaction audit trail", () => {
  beforeEach(() => {
    clearTransactionHistory(CONTRACT);
    window.localStorage.clear();
  });

  it("records a transaction and returns it in newest-first order", () => {
    logTransaction(CONTRACT, {
      hash: "0xaa11",
      functionName: "commit_terms",
      status: "ACCEPTED",
    });
    logTransaction(CONTRACT, {
      hash: "0xbb22",
      functionName: "open_dispute",
      status: "ACCEPTED",
    });

    const history = getTransactionHistory(CONTRACT);
    expect(history).toHaveLength(2);
    expect(history[0].functionName).toBe("open_dispute");
    expect(history[1].functionName).toBe("commit_terms");
    expect(history[0].timestamp).toBeTruthy();
  });

  it("keys history by contract so records never mix", () => {
    logTransaction(CONTRACT, { hash: "0xaa", functionName: "commit_terms", status: "OK" });
    logTransaction("0x9999999999999999999999999999999999999999", {
      hash: "0xbb",
      functionName: "request_dispute",
      status: "OK",
    });

    expect(getTransactionHistory(CONTRACT)).toHaveLength(1);
    expect(getTransactionHistory(CONTRACT)[0].functionName).toBe("commit_terms");
  });

  it("caps history at 50 records", () => {
    for (let i = 0; i < 55; i++) {
      logTransaction(CONTRACT, { hash: `0x${i}`, functionName: "commit_terms", status: "OK" });
    }
    expect(getTransactionHistory(CONTRACT)).toHaveLength(50);
  });

  it("clear wipes the log", () => {
    logTransaction(CONTRACT, { hash: "0xaa", functionName: "commit_terms", status: "OK" });
    clearTransactionHistory(CONTRACT);
    expect(getTransactionHistory(CONTRACT)).toHaveLength(0);
  });
});

describe("functionLabel", () => {
  it("maps known functions to readable labels", () => {
    expect(functionLabel("commit_terms")).toBe("Commit terms");
    expect(functionLabel("open_dispute")).toBe("Reveal terms & open dispute");
    expect(functionLabel("force_resolve_dispute")).toBe("Force resolve dispute");
  });

  it("falls back to a titleized function name", () => {
    expect(functionLabel("unknown_fn")).toBe("unknown fn");
  });
});