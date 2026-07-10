import { describe, it, expect } from "vitest";
import { deriveInitialTab } from "./profile-tabs";

describe("deriveInitialTab", () => {
  it("returns the locked default ('stats') for undefined / empty / unknown values", () => {
    expect(deriveInitialTab(undefined)).toBe("stats");
    expect(deriveInitialTab("")).toBe("stats");
    expect(deriveInitialTab("nonsense")).toBe("stats");
  });

  it("aliases retired / renamed tab ids forward (Sigil convergence)", () => {
    expect(deriveInitialTab("composite")).toBe("stats"); // composite card → "Stats"
    expect(deriveInitialTab("vibes")).toBe("sigil"); // synthesis → crown "Sigil"
    expect(deriveInitialTab("trends")).toBe("momentum");
    expect(deriveInitialTab("starline")).toBe("momentum"); // legacy misspelling
    expect(deriveInitialTab("traits")).toBe("rating"); // statistical read → "Rating"
    expect(deriveInitialTab("specialist")).toBe("rating");
    expect(deriveInitialTab("transfers")).toBe("news"); // folded into News as a scope
    expect(deriveInitialTab("suitors")).toBe("news");
    expect(deriveInitialTab("roster")).toBe("stats"); // moved to /leaderboard team scope
    expect(deriveInitialTab("compare")).toBe("stats");
    expect(deriveInitialTab("leaderboard")).toBe("stats"); // retired → /leaderboard page
    expect(deriveInitialTab("Composite")).toBe("stats"); // aliases are case-insensitive
  });

  it("maps every valid tab value through unchanged", () => {
    expect(deriveInitialTab("stats")).toBe("stats");
    expect(deriveInitialTab("rating")).toBe("rating");
    expect(deriveInitialTab("sigil")).toBe("sigil");
    expect(deriveInitialTab("momentum")).toBe("momentum");
    expect(deriveInitialTab("news")).toBe("news");
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTab("SIGIL")).toBe("sigil");
    expect(deriveInitialTab("StArLiNe")).toBe("momentum"); // alias, case-insensitive
    expect(deriveInitialTab("COMPOSITE")).toBe("stats");
  });
});
