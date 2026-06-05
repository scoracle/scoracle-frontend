import { describe, it, expect } from "vitest";
import { deriveInitialTab } from "./profile-tabs";

describe("deriveInitialTab", () => {
  it("returns the locked default ('composite') for undefined / empty / unknown values", () => {
    expect(deriveInitialTab(undefined)).toBe("composite");
    expect(deriveInitialTab("")).toBe("composite");
    expect(deriveInitialTab("nonsense")).toBe("composite");
  });

  it("aliases retired / renamed tab ids forward", () => {
    // stats/traits/compare → composite; starline → trends (renamed misspelling).
    expect(deriveInitialTab("stats")).toBe("composite");
    expect(deriveInitialTab("starline")).toBe("trends");
    expect(deriveInitialTab("traits")).toBe("composite");
    expect(deriveInitialTab("compare")).toBe("composite");
    expect(deriveInitialTab("Stats")).toBe("composite"); // aliases are case-insensitive
  });

  it("maps every valid tab value through unchanged", () => {
    expect(deriveInitialTab("composite")).toBe("composite");
    expect(deriveInitialTab("specialist")).toBe("specialist");
    expect(deriveInitialTab("trends")).toBe("trends");
    expect(deriveInitialTab("vibes")).toBe("vibes");
    expect(deriveInitialTab("news")).toBe("news");
    expect(deriveInitialTab("leaderboard")).toBe("leaderboard");
    expect(deriveInitialTab("roster")).toBe("roster");
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTab("VIBES")).toBe("vibes");
    expect(deriveInitialTab("StArLiNe")).toBe("trends"); // alias, case-insensitive
    expect(deriveInitialTab("COMPOSITE")).toBe("composite");
  });
});
