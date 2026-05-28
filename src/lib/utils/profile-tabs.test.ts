import { describe, it, expect } from "vitest";
import { deriveInitialTab } from "./profile-tabs";

describe("deriveInitialTab", () => {
  it("returns the locked default ('stats') for undefined / empty / unknown values", () => {
    expect(deriveInitialTab(undefined)).toBe("stats");
    expect(deriveInitialTab("")).toBe("stats");
    expect(deriveInitialTab("nonsense")).toBe("stats");
  });

  it("maps every valid tab value through unchanged", () => {
    expect(deriveInitialTab("stats")).toBe("stats");
    expect(deriveInitialTab("news")).toBe("news");
    expect(deriveInitialTab("vibes")).toBe("vibes");
    expect(deriveInitialTab("traits")).toBe("traits");
    expect(deriveInitialTab("trends")).toBe("trends");
    expect(deriveInitialTab("compare")).toBe("compare");
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTab("VIBES")).toBe("vibes");
    expect(deriveInitialTab("Compare")).toBe("compare");
    expect(deriveInitialTab("StAtS")).toBe("stats");
  });
});
