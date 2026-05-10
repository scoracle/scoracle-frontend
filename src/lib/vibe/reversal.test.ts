import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  REVERSAL_THRESHOLD,
  isReversed,
  readPreviousScore,
  writeCurrentScore,
  evaluateReversal,
} from "./reversal";

// happy-dom's bundled localStorage in this version is missing the standard
// Storage methods (getItem/setItem/clear all undefined). Install a Map-backed
// Storage shim on both globalThis and window so the helper's `window.localStorage`
// access resolves to a working implementation.
const makeStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
};
const localStorageShim = makeStorage();
Object.defineProperty(globalThis, "localStorage", { value: localStorageShim, configurable: true, writable: true });
Object.defineProperty(window, "localStorage", { value: localStorageShim, configurable: true, writable: true });

const KEY = { sport: "nba", type: "player", id: "237" };

describe("isReversed", () => {
  it("returns false on first viewing (null previous)", () => {
    expect(isReversed(70, null)).toBe(false);
  });

  it("returns true when score dropped by exactly the threshold", () => {
    expect(isReversed(70, 70 + REVERSAL_THRESHOLD)).toBe(true);
  });

  it("returns true when score dropped by more than the threshold", () => {
    expect(isReversed(60, 80)).toBe(true);
  });

  it("returns false when score dropped by less than the threshold", () => {
    expect(isReversed(70, 70 + REVERSAL_THRESHOLD - 1)).toBe(false);
  });

  it("returns false on upward movement (asymmetric — quiet on the way up)", () => {
    expect(isReversed(80, 50)).toBe(false);
  });

  it("returns false on no movement", () => {
    expect(isReversed(70, 70)).toBe(false);
  });

  it("returns false for non-finite values", () => {
    expect(isReversed(NaN, 70)).toBe(false);
    expect(isReversed(70, NaN)).toBe(false);
    expect(isReversed(Infinity, 70)).toBe(false);
  });
});

describe("readPreviousScore + writeCurrentScore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing has been cached", () => {
    expect(readPreviousScore(KEY)).toBeNull();
  });

  it("round-trips a written score", () => {
    writeCurrentScore(KEY, 73);
    expect(readPreviousScore(KEY)).toBe(73);
  });

  it("namespaces by sport + type + id (different entities don't collide)", () => {
    writeCurrentScore({ sport: "nba", type: "player", id: "237" }, 73);
    writeCurrentScore({ sport: "nba", type: "player", id: "238" }, 50);
    expect(readPreviousScore({ sport: "nba", type: "player", id: "237" })).toBe(73);
    expect(readPreviousScore({ sport: "nba", type: "player", id: "238" })).toBe(50);
  });

  it("survives round-trip even with stringy id (URL-param friendly)", () => {
    writeCurrentScore({ sport: "nfl", type: "team", id: "11" }, 55);
    expect(readPreviousScore({ sport: "nfl", type: "team", id: "11" })).toBe(55);
  });

  it("returns null on unparseable cached data without throwing", () => {
    window.localStorage.setItem("scoracle:vibe:nba:player:237", "not json");
    expect(readPreviousScore(KEY)).toBeNull();
  });

  it("ignores non-finite cached values", () => {
    window.localStorage.setItem(
      "scoracle:vibe:nba:player:237",
      JSON.stringify({ score: "not a number", cachedAt: "x" })
    );
    expect(readPreviousScore(KEY)).toBeNull();
  });

  it("does not throw when storage write fails (quota exceeded)", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeCurrentScore(KEY, 73)).not.toThrow();
    setItem.mockRestore();
  });
});

describe("evaluateReversal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns no-reversal + null previous on first visit, then caches the new score", () => {
    const result = evaluateReversal(KEY, 73);
    expect(result.reversed).toBe(false);
    expect(result.previousScore).toBeNull();
    // Subsequent read sees the just-written value
    expect(readPreviousScore(KEY)).toBe(73);
  });

  it("returns reversal=true when the new score is meaningfully lower than cached", () => {
    writeCurrentScore(KEY, 80);
    const result = evaluateReversal(KEY, 60);
    expect(result.reversed).toBe(true);
    expect(result.previousScore).toBe(80);
  });

  it("returns reversal=false on small drop below threshold, but still updates cache", () => {
    writeCurrentScore(KEY, 70);
    const result = evaluateReversal(KEY, 68);
    expect(result.reversed).toBe(false);
    expect(result.previousScore).toBe(70);
    expect(readPreviousScore(KEY)).toBe(68);
  });

  it("returns reversal=false on upward movement (asymmetric)", () => {
    writeCurrentScore(KEY, 50);
    const result = evaluateReversal(KEY, 80);
    expect(result.reversed).toBe(false);
    expect(result.previousScore).toBe(50);
  });
});
