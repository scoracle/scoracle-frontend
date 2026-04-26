import { describe, it, expect } from "vitest";
import {
  normalizePercentiles,
  categorizeStats,
  getRateLabel,
  getStatLabel,
  getBoxScoreGroups,
} from "./stats-categorizer";

describe("normalizePercentiles", () => {
  it("returns the object map unchanged", () => {
    const input = { pts: 80, reb: 60 };
    expect(normalizePercentiles(input)).toEqual({ pts: 80, reb: 60 });
  });

  it("converts the array form to a key→percentile map", () => {
    const input = [
      { stat_key: "pts", percentile: 80 },
      { stat_key: "reb", percentile: 60 },
    ];
    expect(normalizePercentiles(input)).toEqual({ pts: 80, reb: 60 });
  });

  it("filters out malformed array entries", () => {
    // Runtime feeds the function arbitrary JSON, so the runtime guard
    // protects against shape drift. Cast through `unknown` to exercise
    // the malformed-row branch without TS rejecting the test fixture.
    const input = [
      { stat_key: "pts", percentile: 80 },
      { stat_key: "reb", percentile: "not a number" },
      { stat_key: "", percentile: 50 },
    ] as unknown as Array<{ stat_key: string; percentile: number }>;
    expect(normalizePercentiles(input)).toEqual({ pts: 80 });
  });

  it("returns empty object for null/undefined input", () => {
    expect(normalizePercentiles(null)).toEqual({});
    expect(normalizePercentiles(undefined)).toEqual({});
  });
});

describe("categorizeStats", () => {
  it("categorizes NBA player stats by config sections", () => {
    const stats = {
      pts: 28.5,
      ast: 7.2,
      reb: 5.4,
      stl: 1.8,
      blk: 0.5,
      fg_pct: 0.485,
    };
    const percentiles = { pts: 92, ast: 78, reb: 60, stl: 80, blk: 30, fg_pct: 70 };
    const result = categorizeStats(stats, percentiles, "NBA", "player");
    expect(result.length).toBeGreaterThan(0);
    // Each category should hold at least one stat from the input
    for (const cat of result) {
      expect(cat.stats.length).toBeGreaterThan(0);
    }
  });

  it("skips stats that are null/undefined", () => {
    const stats = {
      pts: 28,
      ast: null,
      reb: undefined,
    };
    const result = categorizeStats(stats as Record<string, unknown>, {}, "NBA", "player");
    const allKeys = result.flatMap(c => c.stats.map(s => s.key));
    expect(allKeys).toContain("pts");
    expect(allKeys).not.toContain("ast");
    expect(allKeys).not.toContain("reb");
  });

  it("returns an empty array when no stats match the sport's config", () => {
    const result = categorizeStats({ irrelevant_key: 1 }, {}, "NBA", "player");
    expect(result).toEqual([]);
  });

  it("falls back to NBA player config for an unknown sport (defensive)", () => {
    // Documenting current behavior — the categorizer doesn't throw on
    // unknown sport, it falls back to NBA config. Catches typos at
    // build time without crashing.
    const stats = { pts: 20 };
    const result = categorizeStats(stats, {}, "MADE_UP_SPORT", "player");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getRateLabel", () => {
  it("returns sport-specific rate-stat labels", () => {
    expect(getRateLabel("NBA")).toBe("Per 36");
    expect(getRateLabel("FOOTBALL")).toBe("Per 90");
  });

  it("returns null for sports without a rate concept (NFL)", () => {
    expect(getRateLabel("NFL")).toBe(null);
  });
});

describe("getStatLabel", () => {
  it("returns the human-readable label for known keys", () => {
    expect(getStatLabel("pts")).toBeTruthy();
    expect(getStatLabel("passing_yards")).toBeTruthy();
  });

  it("falls back to formatted key for unknown stats", () => {
    // Underscores and snake_case unfolded into Title Case-ish form
    const result = getStatLabel("some_unknown_key");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getBoxScoreGroups", () => {
  it("groups team stats for a known sport", () => {
    const stats = { wins: 50, losses: 32, win_pct: 0.61 };
    const groups = getBoxScoreGroups(stats, "NBA", "team");
    expect(Array.isArray(groups)).toBe(true);
  });
});
