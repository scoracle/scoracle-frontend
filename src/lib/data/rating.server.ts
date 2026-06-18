/**
 * Sigil product fetcher (/{sport}/{type}/{id}/sigil). The lean sigil
 * projection — the entity's peak skill (the sigil) + the sigil datapoints —
 * plus the Gemma stat commentary (the on-field IDENTITY analysis). Distinct from
 * the Stats product: no fantasy/template/datapoints blocks, narrower payload.
 *
 * 200 with `rating: null` / `commentary: null` when the entity is unrated or the
 * commentary backfill hasn't reached it. 404 → null. Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import type { RatingDatapoint, RatingModeBlock } from "./stats.server";

export type { RatingDatapoint } from "./stats.server";

/** The sigil slice of the season rating — peak skill + the datapoints that
 *  make it. The Sigil card heros the `is_specialty` row and lists the `in_spec`
 *  datapoints; per-X re-picks the peak via `rating_modes`. */
export interface RatingScores {
  season: number;
  /** Player position (e.g. "F-C"); null for teams. */
  position: string | null;
  rating_sigil: number | null;
  rating_sigil_rank: number | null;
  /** Magnitude score of the season Sigil (0-100, ~50 = average, SD 10). */
  rating_sigil_score: number | null;
  /** The entity's strongest sigil label (e.g. "Rim Protection"). */
  rating_sigil_label: string | null;
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
  /** Sigil label divined by Gemma on line 1 ("SIGIL: <label>"); null for rows
   *  generated before prompt s3 or marker rows with no Gemma call. */
  divined_sigil: string | null;
  notability: number;
  notability_components: Record<string, number>;
  season: number;
  prompt_version: string;
  generated_at: string;
}

export interface RatingResponse {
  page: "sigil";
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
  const { url, headers } = entityProductUrl(sport, type, id, "rating", season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`rating ${res.status}`);
  return (await res.json()) as RatingResponse;
}

export const getRating = query(fetchRatingImpl, "rating");
