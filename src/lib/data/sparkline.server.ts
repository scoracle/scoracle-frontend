/**
 * Sparkline (rating) fetcher. Returns one entity's season Composite/Specialist
 * rating (+ ranks + specialty + that season's team) and the per-event dual-rating
 * series that powers the shared composite-vs-specialist sparkline.
 *
 * Like trends, the endpoint returns 200 for any *valid* request — entity
 * existence is the profile endpoint's job. A missing/unrated entity comes back
 * 200 with `rating: null` and `events: []` (verified against the live API), so
 * the Card keys its empty state off `rating == null` rather than an error. A
 * 404 here would be unexpected; we surface it as null defensively. Server-bound
 * via "use server".
 */

import { query } from "@solidjs/router";
import { sparklineUrl } from "../utils/data-sources";

/** One datapoint that feeds the rating engine's Composite/Specialist (backend
 *  migration 030). The frontend draws `pct` (a 0-100 percentile — the core
 *  principle: store the z, serve a percentile); `z` is the raw contribution,
 *  fine-print at most. Composite tab pizzas the `in_comp` rows; the Specialist
 *  tab heros the `is_specialty` row. */
export interface RatingDatapoint {
  label: string;
  /** Raw per-datapoint z (the engine's currency). */
  z: number;
  /** 0-100 percentile of sign*z within the (sport, season, label) population —
   *  what the UI plots. Negative datapoints (turnovers, giveaways) read
   *  correctly: low raw value → high pct. */
  pct: number;
  in_comp: boolean;
  in_spec: boolean;
  /** +1 normal, -1 for "lower is better" datapoints. */
  sign: number;
  /** NFL composite facet ("offense" | "defense" | "special"); "all" otherwise. */
  facet: string;
  /** True for the peak in_spec datapoint (the specialty). Exactly one per entity. */
  is_specialty: boolean;
  /** Raw VOLUME — the underlying counting stat (backend migration 038), shown on
   *  the pizza wedge next to its percentile. Null when the entity lacks the stat. */
  value: number | null;
  /** PLAYERS ONLY (backend migration 043): per-scope percentile of THIS datapoint
   *  within the cohort, `{ scope -> 0-100 }` (currently `position`), parallel to the
   *  positionless `pct`. When a scope is active the pizza/butterfly slice re-ranks
   *  to `scoped_pct[scope]` (the same way Per-X re-rates), falling back to `pct`
   *  when the player has no cohort. Absent/empty for teams + position-less players. */
  scoped_pct?: Record<string, number> | null;
}

/** A team reference (season-aware) attached to a rating. */
export interface RatingTeam {
  id: number;
  name: string;
  short_code: string | null;
  logo_url: string | null;
}

/** Season-rolled rating for one entity. */
export interface SparklineRating {
  season: number;
  league_id: number | null;
  /** Player position (e.g. "F-C"); null for teams. */
  position: string | null;
  /** The entity's team FOR THIS SEASON (season-aware): a player's team that year,
   *  or the team itself for team entities. Null when unknown. Drives the meta
   *  card's team line so it tracks the selected season, not a stale seed year. */
  team: RatingTeam | null;
  /** Team cohort attributes (for the Leaders scope filter); null for players. */
  conference: string | null;
  division: string | null;
  rating_composite: number;
  /** All-time percentile of the season Composite (0-100, higher = better). */
  rating_composite_rank: number;
  rating_specialist: number;
  rating_specialist_rank: number;
  /** The entity's strongest specialty label (e.g. "Rim Protection"). */
  rating_specialty: string;
  /** Per-datapoint breakdown — what the Composite + Specialist cards render. */
  rating_breakdown: RatingDatapoint[];
  /** TEAMS ONLY (backend migration 037): per-category sub-score + percentile,
   *  `{ facet -> { z, pct } }` (offense/defense), served ready-made. Null for
   *  players (display-only facets like discipline/squad carry no category score). */
  rating_categories: Record<string, { z: number; pct: number }> | null;
  /** Cohort re-ranks (backend migration 039): `{ scope -> 0-100 percentile }` —
   *  position (players); conference/division (NBA/NFL teams); league (football).
   *  The scope dropdown picks which percentile the Composite headline shows; "all"
   *  uses rating_composite_rank. Null when the entity has no cohort. */
  rating_scoped_ranks: Record<string, number> | null;
  /** PLAYERS ONLY (backend migrations 042 + 045): alternate rate-mode ratings,
   *  keyed by mode — NBA `per_36` + `per_season`, football `per_90` + `per_game`,
   *  NFL `per_game` (the uniform Per Season/Game/X vocabulary). Each block
   *  mirrors the default columns (composite/specialist/ranks/specialty/breakdown/
   *  scoped_ranks) computed within that mode's population. The Per-X dropdown picks
   *  which block the Composite/Specialist cards render; "default" uses the columns
   *  above. Null for teams / unrated. */
  rating_modes: Record<string, RatingModeBlock> | null;
  /** PLAYERS ONLY (backend migration 046): fantasy-points headline, pre-expanded by
   *  rate mode (`default` + the sport's siblings). `points` = box-score fantasy points
   *  (PPR NFL / DraftKings NBA), `rank` = its positionless percentile, `scoped_ranks` =
   *  per-cohort percentile (currently `position`). The Regular|Fantasy model selector
   *  + the rate selector pick which block the Composite headline shows. Null for teams
   *  / sports without a fantasy preset / unrated. */
  fantasy: Record<string, FantasyBlock> | null;
}

/** One rate-mode's fantasy headline (backend migration 046). */
export interface FantasyBlock {
  points: number;
  rank: number | null;
  scoped_ranks: Record<string, number> | null;
}

/** One alternate rate-mode's rating bundle (backend migration 042) — same shape
 *  as the default columns, recomputed within the per-X population. */
export interface RatingModeBlock {
  composite_rank: number;
  specialist: number;
  specialist_rank: number;
  specialty: string;
  breakdown: RatingDatapoint[];
  scoped_ranks: Record<string, number> | null;
}

/** The view the Composite/Specialist cards render for the selected rate mode:
 *  "default" (or a missing/absent mode block) → the season-total columns; an
 *  alternate mode → its rating_modes block. Pure client switch — no refetch. */
export interface RatingView {
  composite_rank: number;
  specialist: number;
  specialist_rank: number;
  specialty: string;
  breakdown: RatingDatapoint[];
  scoped_ranks: Record<string, number> | null;
}

export function ratingForMode(r: SparklineRating, mode: string): RatingView {
  const m = mode !== "default" ? r.rating_modes?.[mode] : undefined;
  if (m) return m;
  return {
    composite_rank: r.rating_composite_rank,
    specialist: r.rating_specialist,
    specialist_rank: r.rating_specialist_rank,
    specialty: r.rating_specialty,
    breakdown: r.rating_breakdown,
    scoped_ranks: r.rating_scoped_ranks,
  };
}

/** The fantasy headline for the selected rate mode — falls back to the `default`
 *  (base) block when the entity lacks that mode's sibling (mirrors ratingForMode).
 *  Null when the entity/sport has no fantasy points at all. */
export function fantasyForMode(r: SparklineRating, mode: string): FantasyBlock | null {
  if (!r.fantasy) return null;
  return r.fantasy[mode] ?? r.fantasy["default"] ?? null;
}

/** Per-event point on the Composite/Specialist sparkline. */
export interface SparklineEvent {
  fixture_id: number;
  /** UTC ISO-8601 kickoff/tipoff — positions dots on a true time axis so
   *  game clusters and quiet stretches read honestly (mirrors TrendsEventScore). */
  start_time: string;
  /** Raw per-event z-scores (positionless breadth + peak). */
  rating_composite: number;
  rating_specialist: number;
  /** 0-100 positionless percentile of this event's composite / specialist z
   *  within the (sport, season) event population (backend migration 029). These
   *  are what the sparkline plots — same 0-100 scale as the vibe line. */
  rating_composite_pct: number;
  rating_specialist_pct: number;
  /** The specialty the entity graded out best at *in this event*. */
  rating_specialty: string;
}

export interface SparklineResponse {
  page: "sparkline";
  sport: string;
  entity_type: string;
  entity_id: number;
  season: number;
  /** Seasons (newest-first) that have a rated row for this entity — powers the
   *  profile year selector. The backend guarantees each resolves to data. */
  available_seasons: number[];
  /** Null when the entity has no rated season in scope — the Card renders a
   *  not-enough-data empty state in that case. */
  rating: SparklineRating | null;
  /** Per-event series, newest-first. Empty when unrated. */
  events: SparklineEvent[];
}

async function fetchSparklineImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<SparklineResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = sparklineUrl(sport, type, id, season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`sparkline ${res.status}`);
  return (await res.json()) as SparklineResponse;
}

export const getSparkline = query(fetchSparklineImpl, "sparkline");
