import { describe, it, expect } from "vitest";
import { categoryFor } from "./categories";

describe("categoryFor", () => {
  it("returns 'vibes' for vibe card regardless of sport", () => {
    expect(categoryFor("vibe", "nba")).toBe("vibes");
    expect(categoryFor("vibe", "nfl")).toBe("vibes");
    expect(categoryFor("vibe", "football")).toBe("vibes");
  });

  it("returns the sport-neutral default for attack/defense/possession/discipline", () => {
    expect(categoryFor("stats:attack", "nba")).toBe("attacking");
    expect(categoryFor("stats:defense", "nfl")).toBe("defensive");
    expect(categoryFor("stats:possession", "football")).toBe("possession");
    expect(categoryFor("stats:discipline", "nba")).toBe("discipline");
  });

  it("uses sport-specific override for setpiece", () => {
    expect(categoryFor("stats:setpiece", "football")).toBe("set pieces");
    expect(categoryFor("stats:setpiece", "nfl")).toBe("special teams");
    expect(categoryFor("stats:setpiece", "nba")).toBe("dead ball");
  });

  it("appends 'comparison' for compare cards", () => {
    expect(categoryFor("compare:attack", "football")).toBe("attacking comparison");
    expect(categoryFor("compare:setpiece", "nfl")).toBe("special teams comparison");
    expect(categoryFor("compare:defense", "nba")).toBe("defensive comparison");
  });

  it("is case-insensitive on sport", () => {
    expect(categoryFor("stats:setpiece", "NBA")).toBe("dead ball");
    expect(categoryFor("stats:setpiece", "Football")).toBe("set pieces");
  });
});
