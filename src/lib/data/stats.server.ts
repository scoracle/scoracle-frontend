/**
 * Stats product fetcher (/{sport}/{type}/{id}/stats). One entity's season
 * Composite/Specialist rating (+ ranks + specialty + that season's team) and the
 * per-event dual-rating series that powers the Trends sparkline. The stat
 * commentary is its own product now (/special, getSpecial).
 *
 * Like trends, the endpoint returns 200 for any *valid* request — entity
 * existence is the profile endpoint's job. A missing/unrated entity comes back
 * 200 with `rating: null` and `events: []` (verified against the live API), so
 * the Card keys its empty state off `rating == null` rather than an error. A
 * 404 here would be unexpected; we surface it as null defensively. Server-bound
 * via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

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
export interface StatsRating {
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
  rating_composite: number | null;
  /** All-time percentile of the season Composite (0-100, higher = better). */
  rating_composite_rank: number | null;
  /** Magnitude score of the season Composite (0-100, ~50 = average, SD 10) —
   *  the displayed Rating. */
  rating_composite_score: number | null;
  rating_peak: number | null;
  rating_peak_rank: number | null;
  /** Magnitude score of the season Specialist (0-100, ~50 = average, SD 10). */
  rating_peak_score: number | null;
  /** The entity's strongest specialty label (e.g. "Rim Protection"). */
  rating_peak_label: string | null;
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
  /** Magnitude-score parallel to rating_scoped_ranks: `{ scope -> 0-100 score }`
   *  (position/conference/division/league). The scope dropdown picks which score the
   *  Composite headline shows; "all" uses rating_composite_score. Null when no cohort. */
  rating_scoped_scores: Record<string, number> | null;
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
  /** Players + teams (backend migrations 047 + 055 + 056): counting-stat template
   *  for the Composite pizza, pre-expanded by rate mode. NFL offensive skill + NBA
   *  players carry unfaceted templates (facet null → the Fantasy-mode single pizza);
   *  football players carry faceted templates per position group (→ the Regular-mode
   *  facet-grouped pizzas); teams (all 3 sports, 056) carry offense/defense-faceted
   *  templates — `default` mode only since teams have no rate modes (templateForMode
   *  falls back). Null elsewhere (NFL defense, unknown positions) → the card keeps
   *  its z-score pizza. Each wedge carries the raw stat + cohort percentile
   *  (within-position for players, sport-wide for teams). */
  template: Record<string, TemplateStat[]> | null;
  /** Players + teams (backend migrations 055 + 056): EVERY percentile-ranked base
   *  stat for this entity — default rate mode only — labeled/faceted/sorted from
   *  stat_definitions. The generic data layer behind future datapoint surfaces;
   *  nothing renders it yet. Null for unranked entities. */
  datapoints: DatapointStat[] | null;
}

/** One rate-mode's fantasy headline (backend migration 046). */
export interface FantasyBlock {
  points: number;
  rank: number | null;
  scoped_ranks: Record<string, number> | null;
}

/** One counting-stat wedge in a template (backend migrations 047 + 055 + 056). */
export interface TemplateStat {
  key: string;
  label: string;
  /** Raw counting stat for the active rate mode (0 when the player lacks it). */
  value: number;
  /** 0-100 within-position percentile (is_inverse already applied for INT/fumbles).
   *  The baseline slice value; the cohort-scope selector swaps to `scoped_pct[scope]`. */
  pct: number;
  /** Per-cohort percentiles for the slice re-rank (backend migration 058):
   *  {all, position?, conference?, division?, league?} — the keys present depend on
   *  the sport (NFL: position/conference/division; NBA: all/conference; football:
   *  all/league; + 'all' positionless everywhere). Null on entities with no cohorts. */
  scoped_pct?: Record<string, number> | null;
  /** Pizza grouping (backend migrations 055 + 056): null on the unfaceted NFL/NBA
   *  player fantasy templates (single pizza); set on football player templates and
   *  all team templates — offense/defense for teams (one pizza per facet). */
  facet: string | null;
  sort: number;
}

/** One generic ranked datapoint (backend migrations 055 + 056) — a base stat key with
 *  its label/facet from stat_definitions, value, and overall + cohort percentiles. */
export interface DatapointStat {
  key: string;
  label: string;
  value: number;
  /** 0-100 overall percentile (is_inverse already applied). */
  pct: number;
  /** Cohort re-ranks — `{ position: pct }` for players; `{ conference: pct }` (NBA,
   *  NFL) / `{ league: pct }` (football) for teams. Null when no cohort. */
  scoped_pct: Record<string, number> | null;
  /** stat_definitions category (e.g. "scoring", "goalkeeper", "discipline"). */
  facet: string;
  sort: number;
}

/** One alternate rate-mode's rating bundle (backend migration 042) — same shape
 *  as the default columns, recomputed within the per-X population. */
export interface RatingModeBlock {
  composite_rank: number;
  /** Magnitude scores (0-100, ~50 = average) within this mode's population. */
  composite_score: number;
  peak: number;
  peak_rank: number;
  peak_score: number;
  peak_label: string;
  breakdown: RatingDatapoint[];
  scoped_ranks: Record<string, number> | null;
  scoped_scores?: Record<string, number> | null;
}

/** The view the Composite/Specialist cards render for the selected rate mode:
 *  "default" (or a missing/absent mode block) → the season-total columns; an
 *  alternate mode → its rating_modes block. Pure client switch — no refetch. */
export interface RatingView {
  /** Null for sub-gate (low-minute) players — they carry a breakdown but no rank. */
  composite_rank: number | null;
  /** Magnitude scores (0-100, ~50 = average) — the displayed Rating headline. Null when unranked. */
  composite_score: number | null;
  peak: number | null;
  peak_rank: number | null;
  peak_score: number | null;
  peak_label: string | null;
  breakdown: RatingDatapoint[];
  scoped_ranks: Record<string, number> | null;
  scoped_scores?: Record<string, number> | null;
}

export function ratingForMode(r: StatsRating, mode: string): RatingView {
  const m = mode !== "default" ? r.rating_modes?.[mode] : undefined;
  if (m) return m;
  return {
    composite_rank: r.rating_composite_rank,
    composite_score: r.rating_composite_score,
    peak: r.rating_peak,
    peak_rank: r.rating_peak_rank,
    peak_score: r.rating_peak_score,
    peak_label: r.rating_peak_label,
    breakdown: r.rating_breakdown,
    scoped_ranks: r.rating_scoped_ranks,
    scoped_scores: r.rating_scoped_scores,
  };
}

/** The fantasy headline for the selected rate mode — falls back to the `default`
 *  (base) block when the entity lacks that mode's sibling (mirrors ratingForMode).
 *  Null when the entity/sport has no fantasy points at all. */
export function fantasyForMode(r: StatsRating, mode: string): FantasyBlock | null {
  if (!r.fantasy) return null;
  return r.fantasy[mode] ?? r.fantasy["default"] ?? null;
}

/** The counting-stat template for the selected rate mode — falls back to `default`
 *  when the mode sibling is absent. Null when the position has no template (NBA,
 *  football, NFL defense) → the Composite card renders its z-score pizza instead. */
export function templateForMode(r: StatsRating, mode: string): TemplateStat[] | null {
  if (!r.template) return null;
  return r.template[mode] ?? r.template["default"] ?? null;
}

/** Per-event point on the Composite/Specialist sparkline. */
export interface StatEvent {
  fixture_id: number;
  /** UTC ISO-8601 kickoff/tipoff — positions dots on a true time axis so
   *  game clusters and quiet stretches read honestly (mirrors MomentumEventScore). */
  start_time: string;
  /** Raw per-event z-scores (positionless breadth + peak). */
  rating_composite: number;
  rating_peak: number;
  /** 0-100 positionless percentile of this event's composite / specialist z
   *  within the (sport, season) event population (backend migration 029). These
   *  are what the sparkline plots — same 0-100 scale as the vibe line. */
  rating_composite_pct: number;
  rating_peak_pct: number;
  /** The specialty the entity graded out best at *in this event*. */
  rating_peak_label: string;
}

export interface StatsResponse {
  page: "stats";
  sport: string;
  entity_type: string;
  entity_id: number;
  season: number;
  /** Seasons (newest-first) that have a rated row for this entity — powers the
   *  profile year selector. The backend guarantees each resolves to data. */
  available_seasons: number[];
  /** Null when the entity has no rated season in scope — the Card renders a
   *  not-enough-data empty state in that case. */
  rating: StatsRating | null;
  /** Per-event series, newest-first. Empty when unrated. */
  events: StatEvent[];
}

async function fetchStatsImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<StatsResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  return fetchJsonOrNull<StatsResponse>(entityProductUrl(sport, type, id, "stats", season), "stats");
}

export const getStats = query(fetchStatsImpl, "stats");
