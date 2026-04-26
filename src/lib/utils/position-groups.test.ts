import { describe, it, expect } from "vitest";
import {
  getPositionGroup,
  getPositionGroupDisplay,
  isSamePositionGroup,
  getPositionGroupsForSport,
} from "./position-groups";

describe("getPositionGroup", () => {
  it("normalizes NBA positions", () => {
    expect(getPositionGroup("nba", "PG")).toBe("guard");
    expect(getPositionGroup("nba", "SF")).toBe("forward");
    expect(getPositionGroup("nba", "C")).toBe("center");
  });

  it("normalizes NFL positions", () => {
    expect(getPositionGroup("nfl", "QB")).toBe("quarterback");
    expect(getPositionGroup("nfl", "WR")).toBe("receiver");
    expect(getPositionGroup("nfl", "RB")).toBe("running-back");
  });

  it("is case-insensitive", () => {
    expect(getPositionGroup("nba", "pg")).toBe("guard");
    expect(getPositionGroup("NFL", "qb")).toBe("quarterback");
  });

  it("normalizes the upper-case sport id (NBA == nba)", () => {
    expect(getPositionGroup("NBA", "PG")).toBe("guard");
    expect(getPositionGroup("FOOTBALL", "GK")).toBe("goalkeeper");
  });

  it("returns undefined for unknown positions or sports", () => {
    expect(getPositionGroup("nba", "Unknown")).toBe(undefined);
    expect(getPositionGroup("cricket", "Bowler")).toBe(undefined);
    expect(getPositionGroup("nba", null)).toBe(undefined);
    expect(getPositionGroup("nba", undefined)).toBe(undefined);
  });
});

describe("isSamePositionGroup", () => {
  it("returns true when both positions resolve to the same group", () => {
    expect(isSamePositionGroup("nba", "PG", "SG")).toBe(true);
    expect(isSamePositionGroup("nfl", "WR", "TE")).toBe(true);
  });

  it("returns false when positions resolve to different groups", () => {
    expect(isSamePositionGroup("nba", "PG", "C")).toBe(false);
    expect(isSamePositionGroup("nfl", "QB", "WR")).toBe(false);
  });

  it("returns true (permissive) when either position is unknown", () => {
    // Unknown positions don't filter out comparisons — by design.
    expect(isSamePositionGroup("nba", "PG", "Unknown")).toBe(true);
    expect(isSamePositionGroup("nba", null, "C")).toBe(true);
  });
});

describe("getPositionGroupDisplay", () => {
  it("formats group ids for display", () => {
    expect(getPositionGroupDisplay("guard")).toBe("Guard");
    expect(getPositionGroupDisplay("quarterback")).toBe("Quarterback");
  });

  it("returns 'Unknown' for null/undefined", () => {
    expect(getPositionGroupDisplay(null)).toBe("Unknown");
    expect(getPositionGroupDisplay(undefined)).toBe("Unknown");
  });
});

describe("getPositionGroupsForSport", () => {
  it("returns the unique set of groups for a sport", () => {
    const nba = getPositionGroupsForSport("nba");
    expect(nba).toContain("guard");
    expect(nba).toContain("forward");
    expect(nba).toContain("center");
  });

  it("returns empty array for unknown sport", () => {
    expect(getPositionGroupsForSport("cricket")).toEqual([]);
  });
});
