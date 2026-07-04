/**
 * Rating product fetcher (/{sport}/{type}/{id}/rating). The lean peak-skill
 * projection — the entity's peak skill + the peak datapoints —
 * plus the Gemma stat commentary (the on-field IDENTITY analysis). Distinct from
 * the Stats product: no fantasy/template/datapoints blocks, narrower payload.
 *
 * 200 with `rating: null` / `commentary: null` when the entity is unrated or the
 * commentary backfill hasn't reached it. 404 → null. Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";
import type { RatingDatapoint, RatingModeBlock } from "./stats.server";

export type { RatingDatapoint } from "./stats.server";

/** The peak slice of the season rating — peak skill + the datapoints that
 *  make it. The Rating card heros the `is_specialty` row and lists the `in_spec`
 *  datapoints; per-X re-picks the peak via `rating_modes`. */
export interface RatingScores {
  season: number;
  /** Player position (e.g. "F-C"); null for teams. */
  position: string | null;
  rating_peak: number | null;
  rating_peak_rank: number | null;
  /** Magnitude score of the season peak (0-100, ~50 = average, SD 10). */
  rating_peak_score: number | null;
  /** The entity's strongest peak label (e.g. "Rim Protection"). */
  rating_peak_label: string | null;
  /** Positionless magnitude of the season COMPOSITE (0-100, ~50 avg, SD 10) — the
   *  Rating headline score (symmetric with the Vibe's sentiment score). */
  rating_composite_score: number | null;
  /** Positionless composite percentile (0-100). */
  rating_composite_rank: number | null;
  /** Per-datapoint breakdown; the card filters to in_spec / is_specialty. */
  rating_breakdown: RatingDatapoint[];
  /** PLAYERS ONLY: per-X rate-mode blocks (the Per-X dropdown re-picks the peak). */
  rating_modes: Record<string, RatingModeBlock> | null;
}

/** The Gemma on-field IDENTITY analysis (the stats-rail narrative) — composite =
 *  how well, sigil = how. Null until the stat-commentary backfill reaches this
 *  entity-season. notability (0-100) drives the analysis depth. */
export interface StatCommentary {
  body: string;
  /** Peak-strength label divined by Gemma on line 1 ("PEAK: <label>"); null for
   *  rows generated before the label existed or marker rows with no Gemma call. */
  divined_peak: string | null;
  notability: number;
  notability_components: Record<string, number>;
  season: number;
  prompt_version: string;
  generated_at: string;
  peak_trajectory: "rising" | "falling" | "steady" | null;
  peak_trajectory_label: string | null;
  peak_trajectory_components: {
    source: "event_rating_z_scores";
    metrics: Array<"rating_composite" | "rating_peak">;
    combined_z_slope?: number | null;
    composite_z_slope?: number | null;
    peak_z_slope?: number | null;
    latest_composite_z?: number | null;
    latest_peak_z?: number | null;
    recent_composite_z?: number[] | null;
    recent_peak_z?: number[] | null;
    composite_sample_size?: number | null;
    peak_sample_size?: number | null;
  } | null;
}

export interface RatingResponse {
  page: "rating";
  sport: string;
  entity_type: string;
  entity_id: number;
  season: number;
  /** Null when the entity has no rated season in scope. */
  rating: RatingScores | null;
  /** The on-field identity analysis; null until the backfill reaches this entity-season. */
  commentary: StatCommentary | null;
}

async function fetchRatingImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<RatingResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  return fetchJsonOrNull<RatingResponse>(entityProductUrl(sport, type, id, "rating", season), "rating");
}

export const getRating = query(fetchRatingImpl, "rating");
