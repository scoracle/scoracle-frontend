import { describe, it, expect } from "vitest";
import {
  normalizePercentiles,
  categorizeStats,
  categorizeForCharts,
  categorizeRateForCharts,
  CHART_SLOTS,
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

describe("categorizeForCharts (slot pizza grid)", () => {
  it("always returns one entry per CHART_SLOTS in slot order", () => {
    const result = categorizeForCharts({ pts: 20 }, {}, "NBA", "player");
    expect(result.map((c) => c.id)).toEqual([...CHART_SLOTS]);
  });

  it("labels the setpiece slot per sport", () => {
    const findSetpiece = (cats: Array<{ id: string; label: string }>) =>
      cats.find((c) => c.id === "setpiece")?.label;

    expect(findSetpiece(categorizeForCharts({}, {}, "NFL", "player"))).toBe(
      "Special Teams",
    );
    expect(findSetpiece(categorizeForCharts({}, {}, "FOOTBALL", "player"))).toBe(
      "Set Pieces",
    );
    expect(findSetpiece(categorizeForCharts({}, {}, "NBA", "player"))).toBe(
      "Dead Ball",
    );
    expect(findSetpiece(categorizeForCharts({}, {}, "NFL", "team"))).toBe(
      "Special Teams",
    );
  });

  it("routes NFL kicking + punting + return stats into the setpiece slot", () => {
    const stats = {
      field_goals_made: 28,
      field_goal_pct: 0.875,
      punts: 70,
      punt_yards: 3150,
      kick_return_yards: 540,
    };
    const result = categorizeForCharts(stats, {}, "NFL", "player");
    const setpiece = result.find((c) => c.id === "setpiece");
    const setpieceKeys = setpiece?.stats.map((s) => s.key) ?? [];
    expect(setpieceKeys).toEqual(
      expect.arrayContaining([
        "field_goals_made",
        "field_goal_pct",
        "punts",
        "punt_yards",
        "kick_return_yards",
      ]),
    );
  });

  it("routes NBA free throws into the setpiece (Dead Ball) slot", () => {
    const stats = { ftm: 6.2, fta: 7.4, ft_pct: 0.838, pts: 28 };
    const result = categorizeForCharts(stats, {}, "NBA", "player");
    const setpiece = result.find((c) => c.id === "setpiece");
    expect(setpiece?.stats.map((s) => s.key).sort()).toEqual(
      ["ft_pct", "fta", "ftm"],
    );
    // FT stats no longer double-up inside attack
    const attackKeys = result.find((c) => c.id === "attack")?.stats.map((s) => s.key) ?? [];
    expect(attackKeys).not.toContain("ftm");
    expect(attackKeys).not.toContain("ft_pct");
  });

  it("routes Football player penalty stats into the setpiece slot (plural payload keys)", () => {
    // Backend ships plural keys at player level (penalties_scored, _missed,
    // _won) plus a top-level penalty_goals. `corners` is team-only and must
    // not appear on player charts.
    const stats = {
      goals: 18,
      penalty_goals: 4,
      penalties_scored: 5,
      penalties_missed: 1,
      penalties_won: 2,
      corners: 99,
    };
    const result = categorizeForCharts(stats, {}, "FOOTBALL", "player");
    const setpieceKeys = result.find((c) => c.id === "setpiece")?.stats.map((s) => s.key) ?? [];
    expect(setpieceKeys.sort()).toEqual(
      ["penalties_missed", "penalties_scored", "penalties_won", "penalty_goals"],
    );
    expect(setpieceKeys).not.toContain("corners");
  });

  it("routes NFL team punt-return stats via the team key naming (`punt_returns`)", () => {
    // Backend ships punt-return team stats as `punt_returns` /
    // `punt_return_yards`, but at player level as `punt_returner_returns` /
    // `punt_returner_return_yards`. Regression guard for both forms.
    const teamStats = { field_goals_made: 31, punts: 78, punt_returns: 30, punt_return_yards: 424 };
    const teamSet = categorizeForCharts(teamStats, {}, "NFL", "team").find((c) => c.id === "setpiece");
    const teamKeys = teamSet?.stats.map((s) => s.key) ?? [];
    expect(teamKeys).toEqual(expect.arrayContaining(["punt_returns", "punt_return_yards"]));
    expect(teamKeys).not.toContain("punt_returner_returns");

    const playerStats = { field_goals_made: 4, punt_returner_returns: 20, punt_returner_return_yards: 180 };
    const playerSet = categorizeForCharts(playerStats, {}, "NFL", "player").find((c) => c.id === "setpiece");
    const playerKeys = playerSet?.stats.map((s) => s.key) ?? [];
    expect(playerKeys).toEqual(
      expect.arrayContaining(["punt_returner_returns", "punt_returner_return_yards"]),
    );
    expect(playerKeys).not.toContain("punt_returns");
  });

  it("routes Football team dead-ball restarts into setpiece", () => {
    const stats = {
      goals_for: 43,
      corners: 181,
      penalties: 3,
      free_kicks: 413,
      goal_kicks: 323,
      throw_ins: 673,
    };
    const set = categorizeForCharts(stats, {}, "FOOTBALL", "team").find((c) => c.id === "setpiece");
    const keys = set?.stats.map((s) => s.key) ?? [];
    expect(keys.sort()).toEqual(["corners", "free_kicks", "goal_kicks", "penalties", "throw_ins"]);
  });
});

describe("categorizeRateForCharts", () => {
  it("includes a setpiece slot in the NBA per-36 rate config", () => {
    const stats = { ftm_per_36: 5.2, fta_per_36: 6.1, ft_pct: 0.85 };
    const result = categorizeRateForCharts(stats, {}, "NBA");
    const setpiece = result.find((c) => c.id === "setpiece");
    expect(setpiece?.label).toBe("Dead Ball");
    expect(setpiece?.stats.map((s) => s.key).sort()).toEqual(
      ["ft_pct", "fta_per_36", "ftm_per_36"],
    );
  });

  it("returns an empty array for sports without rate stats (NFL)", () => {
    expect(categorizeRateForCharts({}, {}, "NFL")).toEqual([]);
  });
});

describe("getBoxScoreGroups", () => {
  it("groups team stats for a known sport", () => {
    const stats = { wins: 50, losses: 32, win_pct: 0.61 };
    const groups = getBoxScoreGroups(stats, "NBA", "team");
    expect(Array.isArray(groups)).toBe(true);
  });
});
