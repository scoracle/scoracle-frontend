import { describe, it, expect } from "vitest";
import { deriveInitialTab } from "./profile-tabs";

describe("deriveInitialTab", () => {
  it("returns the locked default ('news') for undefined / empty / unknown values", () => {
    expect(deriveInitialTab(undefined)).toBe("news");
    expect(deriveInitialTab("")).toBe("news");
    expect(deriveInitialTab("nonsense")).toBe("news");
  });

  it("maps every valid tab value through unchanged", () => {
    expect(deriveInitialTab("news")).toBe("news");
    expect(deriveInitialTab("x")).toBe("x");
    expect(deriveInitialTab("vibes")).toBe("vibes");
    expect(deriveInitialTab("stats")).toBe("stats");
    expect(deriveInitialTab("traits")).toBe("traits");
    expect(deriveInitialTab("compare")).toBe("compare");
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTab("VIBES")).toBe("vibes");
    expect(deriveInitialTab("Compare")).toBe("compare");
    expect(deriveInitialTab("StAtS")).toBe("stats");
  });
});
