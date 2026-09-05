import { describe, it, expect } from "vitest";
import { deriveInitialTab } from "./profile-tabs";

describe("deriveInitialTab", () => {
  it("returns the locked default ('scouting') for undefined / empty / unknown values", () => {
    expect(deriveInitialTab(undefined)).toBe("scouting");
    expect(deriveInitialTab("")).toBe("scouting");
    expect(deriveInitialTab("nonsense")).toBe("scouting");
  });

  it("aliases retired / renamed tab ids forward (Characters six-card restructure)", () => {
    // The Scout's one turn absorbs both retired cards + their older aliases.
    expect(deriveInitialTab("stats")).toBe("scouting");
    expect(deriveInitialTab("rating")).toBe("scouting");
    expect(deriveInitialTab("composite")).toBe("scouting");
    expect(deriveInitialTab("traits")).toBe("scouting");
    expect(deriveInitialTab("specialist")).toBe("scouting");
    expect(deriveInitialTab("compare")).toBe("profile");
    expect(deriveInitialTab("leaderboard")).toBe("scouting");
    expect(deriveInitialTab("roster")).toBe("scouting");
    // The News hub is The Journalist's card now.
    expect(deriveInitialTab("news")).toBe("narratives");
    // Trajectory aliases ride to The Analyst.
    expect(deriveInitialTab("trends")).toBe("momentum");
    expect(deriveInitialTab("starline")).toBe("momentum"); // legacy misspelling
    // Pre-convergence synthesis id still lands on the crown.
    expect(deriveInitialTab("vibes")).toBe("sigil");
    // Suitors land on The Insider's real card (transfers is a REAL tab now).
    expect(deriveInitialTab("suitors")).toBe("transfers");
    expect(deriveInitialTab("Composite")).toBe("scouting"); // aliases are case-insensitive
  });

  it("maps every valid tab value through unchanged", () => {
    expect(deriveInitialTab("scouting")).toBe("scouting");
    expect(deriveInitialTab("narratives")).toBe("narratives");
    expect(deriveInitialTab("transfers")).toBe("transfers");
    expect(deriveInitialTab("vibe")).toBe("vibe");
    expect(deriveInitialTab("momentum")).toBe("momentum");
    expect(deriveInitialTab("sigil")).toBe("sigil");
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTab("SIGIL")).toBe("sigil");
    expect(deriveInitialTab("StArLiNe")).toBe("momentum"); // alias, case-insensitive
    expect(deriveInitialTab("COMPOSITE")).toBe("scouting");
  });

  it("promotes retired News-hub facet deep links to the facet's real card", () => {
    // ?tab=news&newsView=… — the pre-Characters facet shape.
    expect(deriveInitialTab("news", "transfers")).toBe("transfers");
    expect(deriveInitialTab("news", "vibe")).toBe("vibe");
    expect(deriveInitialTab("narratives", "transfers")).toBe("transfers");
    expect(deriveInitialTab("news", "TRANSFERS")).toBe("transfers"); // case-insensitive
    // The even older ?newsScope=transfers shape rides the same param slot.
    // Real time-window scope values never promote.
    expect(deriveInitialTab("news", "last_week")).toBe("narratives");
    // The facet rode the News hub only — other tabs ignore it.
    expect(deriveInitialTab("sigil", "transfers")).toBe("sigil");
    expect(deriveInitialTab(undefined, "transfers")).toBe("scouting");
    expect(deriveInitialTab("news", undefined)).toBe("narratives");
  });
});
