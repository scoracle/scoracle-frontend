import { describe, it, expect } from "vitest";
import { deriveInitialTab } from "./profile-tabs";

describe("deriveInitialTab", () => {
  it("returns the locked default ('stats') for undefined / empty / unknown values", () => {
    expect(deriveInitialTab(undefined)).toBe("stats");
    expect(deriveInitialTab("")).toBe("stats");
    expect(deriveInitialTab("nonsense")).toBe("stats");
  });

  it("folds the retired 'compare' tab back to the stats default", () => {
    // Compare folded into Stats (2026-05-28). Old `?tab=compare` deep
    // links land on Stats, where the compare view now lives.
    expect(deriveInitialTab("compare")).toBe("stats");
    expect(deriveInitialTab("Compare")).toBe("stats");
  });

  it("maps every valid tab value through unchanged", () => {
    expect(deriveInitialTab("stats")).toBe("stats");
    expect(deriveInitialTab("news")).toBe("news");
    expect(deriveInitialTab("vibes")).toBe("vibes");
    expect(deriveInitialTab("traits")).toBe("traits");
    expect(deriveInitialTab("trends")).toBe("trends");
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTab("VIBES")).toBe("vibes");
    expect(deriveInitialTab("TrEnDs")).toBe("trends");
    expect(deriveInitialTab("StAtS")).toBe("stats");
  });
});
