import { describe, it, expect } from "vitest";
import { ratingForMode, fantasyForMode, templateForMode, type StatsRating, type RatingDatapoint } from "./stats.server";

const DP = (over: Partial<RatingDatapoint> = {}): RatingDatapoint => ({
  label: "Scoring", z: 1, pct: 90, in_comp: true, in_spec: true, sign: 1,
  facet: "all", is_specialty: true, value: 30, ...over,
});

const base = (over: Partial<StatsRating> = {}): StatsRating => ({
  season: 2025, league_id: null, position: "G", team: null, conference: null, division: null,
  rating_composite: 5, rating_composite_rank: 90, rating_composite_score: 68,
  rating_peak: 2, rating_peak_rank: 88, rating_peak_score: 64, rating_peak_label: "Scoring",
  rating_breakdown: [DP()], rating_categories: null,
  rating_scoped_ranks: { position: 80 }, rating_scoped_scores: { position: 62 },
  rating_modes: null, fantasy: null, template: null,
  datapoints: null,
  ...over,
});

describe("ratingForMode", () => {
  it("default mode returns the season-total columns", () => {
    const v = ratingForMode(base(), "default");
    expect(v.composite_rank).toBe(90);
    expect(v.composite_score).toBe(68);
    expect(v.peak_score).toBe(64);
    expect(v.peak_label).toBe("Scoring");
    expect(v.scoped_ranks).toEqual({ position: 80 });
    expect(v.scoped_scores).toEqual({ position: 62 });
  });

  it("an alternate mode returns that rating_modes block", () => {
    const r = base({
      rating_modes: {
        per_36: {
          composite_rank: 72, composite_score: 58, peak: 1.5, peak_rank: 70, peak_score: 56,
          peak_label: "Playmaking",
          breakdown: [DP({ label: "Playmaking", pct: 72 })],
          scoped_ranks: { position: 65 }, scoped_scores: { position: 55 },
        },
      },
    });
    const v = ratingForMode(r, "per_36");
    expect(v.composite_rank).toBe(72);
    expect(v.composite_score).toBe(58); // per-X composes with the magnitude score
    expect(v.peak_label).toBe("Playmaking");
    expect(v.scoped_ranks).toEqual({ position: 65 }); // per-position composes with per-X
    expect(v.scoped_scores).toEqual({ position: 55 });
    expect(v.breakdown[0].label).toBe("Playmaking");
  });

  it("falls back to default when the requested mode block is absent", () => {
    expect(ratingForMode(base(), "per_36").composite_rank).toBe(90); // rating_modes null
    expect(ratingForMode(base(), "per_36").composite_score).toBe(68); // score too
    const r = base({ rating_modes: { per_90: { composite_rank: 1, composite_score: 50, peak: 0, peak_rank: 0, peak_score: 50, peak_label: "x", breakdown: [], scoped_ranks: null } } });
    expect(ratingForMode(r, "per_36").composite_rank).toBe(90); // key missing → default
  });
});

describe("fantasyForMode", () => {
  const withFantasy = base({
    fantasy: {
      default: { points: 287.4, rank: 95, scoped_ranks: { position: 88 } },
      per_season: { points: 4360, rank: 97, scoped_ranks: null },
    },
  });

  it("returns null when the entity has no fantasy block", () => {
    expect(fantasyForMode(base(), "default")).toBeNull();
  });

  it("returns the requested mode's fantasy headline", () => {
    expect(fantasyForMode(withFantasy, "per_season")?.points).toBe(4360);
    expect(fantasyForMode(withFantasy, "default")?.rank).toBe(95);
  });

  it("falls back to the default block when the mode sibling is absent", () => {
    expect(fantasyForMode(withFantasy, "per_36")?.points).toBe(287.4); // no per_36 → default
  });
});

describe("templateForMode", () => {
  const withTemplate = base({
    template: {
      default: [{ key: "passing_yards", label: "Passing Yards", value: 4000, pct: 99, facet: null, sort: 20 }],
      per_game: [{ key: "passing_yards", label: "Passing Yards", value: 250, pct: 98, facet: null, sort: 20 }],
    },
  });

  it("returns null when the position has no template", () => {
    expect(templateForMode(base(), "default")).toBeNull(); // NBA/football/NFL defense
  });

  it("returns the requested mode's template", () => {
    expect(templateForMode(withTemplate, "per_game")?.[0].value).toBe(250);
    expect(templateForMode(withTemplate, "default")?.[0].pct).toBe(99);
  });

  it("falls back to the default template when the mode is absent", () => {
    expect(templateForMode(withTemplate, "per_36")?.[0].value).toBe(4000); // no per_36 → default
  });
});
