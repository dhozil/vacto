/**
 * Safe localStorage wrapper that never throws during SSR/hydration.
 */

const canUseStorage = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__p2p_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const safeStorage = {
  get(key: string): string | null {
    if (!canUseStorage()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (!canUseStorage()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // storage full or unavailable — ignore
    }
  },
  remove(key: string): void {
    if (!canUseStorage()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

/** JSON-safe get with fallback. */
export function safeJsonGet<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** JSON-safe set. */
export function safeJsonSet(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default safeStorage;