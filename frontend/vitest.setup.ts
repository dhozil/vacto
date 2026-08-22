import "@testing-library/jest-dom/vitest";

// jsdom in vitest 4 provides `crypto` but not always `crypto.subtle` with
// secure context. Node 20+ exposes globalThis.crypto.subtle; unify them here.
if (typeof globalThis.crypto !== "undefined" && !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, "subtle", {
    value: (globalThis as any).nodeCrypto?.webcrypto?.subtle,
    configurable: true,
  });
}