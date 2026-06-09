import { describe, it, expect } from "vitest";
import { ratingForMode, fantasyForMode, type SparklineRating, type RatingDatapoint } from "./sparkline.server";

const DP = (over: Partial<RatingDatapoint> = {}): RatingDatapoint => ({
  label: "Scoring", z: 1, pct: 90, in_comp: true, in_spec: true, sign: 1,
  facet: "all", is_specialty: true, value: 30, ...over,
});

const base = (over: Partial<SparklineRating> = {}): SparklineRating => ({
  season: 2025, league_id: null, position: "G", team: null, conference: null, division: null,
  rating_composite: 5, rating_composite_rank: 90,
  rating_specialist: 2, rating_specialist_rank: 88, rating_specialty: "Scoring",
  rating_breakdown: [DP()], rating_categories: null,
  rating_scoped_ranks: { position: 80 }, rating_modes: null, fantasy: null,
  ...over,
});

describe("ratingForMode", () => {
  it("default mode returns the season-total columns", () => {
    const v = ratingForMode(base(), "default");
    expect(v.composite_rank).toBe(90);
    expect(v.specialty).toBe("Scoring");
    expect(v.scoped_ranks).toEqual({ position: 80 });
  });

  it("an alternate mode returns that rating_modes block", () => {
    const r = base({
      rating_modes: {
        per_36: {
          composite_rank: 72, specialist: 1.5, specialist_rank: 70, specialty: "Playmaking",
          breakdown: [DP({ label: "Playmaking", pct: 72 })], scoped_ranks: { position: 65 },
        },
      },
    });
    const v = ratingForMode(r, "per_36");
    expect(v.composite_rank).toBe(72);
    expect(v.specialty).toBe("Playmaking");
    expect(v.scoped_ranks).toEqual({ position: 65 }); // per-position composes with per-X
    expect(v.breakdown[0].label).toBe("Playmaking");
  });

  it("falls back to default when the requested mode block is absent", () => {
    expect(ratingForMode(base(), "per_36").composite_rank).toBe(90); // rating_modes null
    const r = base({ rating_modes: { per_90: { composite_rank: 1, specialist: 0, specialist_rank: 0, specialty: "x", breakdown: [], scoped_ranks: null } } });
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
