/**
 * Special product fetcher (/{sport}/{type}/{id}/special). The lean specialist
 * projection — the entity's peak skill (specialty) + the specialty datapoints —
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

/** The specialist slice of the season rating — peak skill + the datapoints that
 *  make it. The Special card heros the `is_specialty` row and lists the `in_spec`
 *  datapoints; per-X re-picks the peak via `rating_modes`. */
export interface SpecialRating {
  season: number;
  /** Player position (e.g. "F-C"); null for teams. */
  position: string | null;
  rating_specialist: number | null;
  rating_specialist_rank: number | null;
  /** Magnitude score of the season Specialist (0-100, ~50 = average, SD 10). */
  rating_specialist_score: number | null;
  /** The entity's strongest specialty label (e.g. "Rim Protection"). */
  rating_specialty: string | null;
  /** Per-datapoint breakdown; the card filters to in_spec / is_specialty. */
  rating_breakdown: RatingDatapoint[];
  /** PLAYERS ONLY: per-X rate-mode blocks (the Per-X dropdown re-picks the peak). */
  rating_modes: Record<string, RatingModeBlock> | null;
}

/** The Gemma on-field IDENTITY analysis (the stats-rail narrative) — composite =
 *  how well, special = how. Null until the stat-commentary backfill reaches this
 *  entity-season. notability (0-100) drives the analysis depth. */
export interface StatCommentary {
  body: string;
  notability: number;
  notability_components: Record<string, number>;
  season: number;
  prompt_version: string;
  generated_at: string;
}

export interface SpecialResponse {
  page: "special";
  sport: string;
  entity_type: string;
  entity_id: number;
  season: number;
  /** Null when the entity has no rated season in scope. */
  rating: SpecialRating | null;
  /** The on-field identity analysis; null until the backfill reaches this entity-season. */
  commentary: StatCommentary | null;
}

async function fetchSpecialImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<SpecialResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = entityProductUrl(sport, type, id, "special", season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`special ${res.status}`);
  return (await res.json()) as SpecialResponse;
}

export const getSpecial = query(fetchSpecialImpl, "special");
