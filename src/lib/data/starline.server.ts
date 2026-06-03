/**
 * Starline (rating) fetcher. Returns one entity's season Composite/Specialist
 * rating (+ ranks + specialty) and the per-event dual-rating series that powers
 * the shared composite-vs-specialist sparkline.
 *
 * Like trends, the endpoint returns 200 for any *valid* request — entity
 * existence is the profile endpoint's job. A missing/unrated entity comes back
 * 200 with `rating: null` and `events: []` (verified against the live API), so
 * the Card keys its empty state off `rating == null` rather than an error. A
 * 404 here would be unexpected; we surface it as null defensively. Server-bound
 * via "use server".
 */

import { query } from "@solidjs/router";
import { starlineUrl } from "../utils/data-sources";

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
}

/** Season-rolled rating for one entity. */
export interface StarlineRating {
  season: number;
  league_id: number | null;
  /** Player position (e.g. "F-C"); null for teams. */
  position: string | null;
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
}

/** Per-event point on the Composite/Specialist sparkline. */
export interface StarlineEvent {
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

export interface StarlineResponse {
  page: "starline";
  sport: string;
  entity_type: string;
  entity_id: number;
  season: number;
  /** Seasons (newest-first) that have a rated row for this entity — powers the
   *  profile year selector. The backend guarantees each resolves to data. */
  available_seasons: number[];
  /** Null when the entity has no rated season in scope — the Card renders a
   *  not-enough-data empty state in that case. */
  rating: StarlineRating | null;
  /** Per-event series, newest-first. Empty when unrated. */
  events: StarlineEvent[];
}

async function fetchStarlineImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<StarlineResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = starlineUrl(sport, type, id, season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`starline ${res.status}`);
  return (await res.json()) as StarlineResponse;
}

export const getStarline = query(fetchStarlineImpl, "starline");
