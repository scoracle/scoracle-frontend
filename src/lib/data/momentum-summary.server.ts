/**
 * Momentum summary fetcher — the GENERATED momentum product
 * (/{sport}/{type}/{id}/momentum/summary): the model's trajectory verdict
 * (direction / score −5..5 / blurb) from `momentum_summaries` plus the
 * deterministic slope numbers from `latest_momentum_scores_per_entity`.
 *
 * This is the direction/score contract MomentumCard's trajectory-first
 * headline was waiting on (the card must not derive that verdict locally).
 * Distinct from getMomentum (`/momentum`), which serves the raw sparkline
 * series. Endpoint always returns 200; `summary`/`scores` are null when the
 * entity has no fresh row (live view is 72h-gated; explicit ?season serves
 * that season's final row ungated) — render the headline only when present.
 * Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

/** The model's trajectory verdict (momentum_summaries). */
export interface MomentumSummaryVerdict {
  /** rising | falling | steady (DB CHECK-constrained; typed open for forward compat). */
  direction: "rising" | "falling" | "steady" | null;
  /** Signed verdict score, −5..5. */
  score: number | null;
  /** The model's short prose read of WHY the trajectory is what it is. */
  blurb: string | null;
  model_version: string;
  prompt_version: string;
  generated_at: string;
}

/** The deterministic slope inputs behind the verdict (momentum_scores latest row). */
export interface MomentumSummaryScores {
  /** Signed average of the present slopes. */
  momentum_score: number | null;
  vibe_slope: number | null;
  vibe_samples: number;
  vibe_window_start: string | null;
  vibe_window_end: string | null;
  rating_slope: number | null;
  rating_samples: number;
  rating_window_start: string | null;
  rating_window_end: string | null;
  season: number | null;
  generated_at: string;
}

export interface MomentumSummaryResponse {
  page: "momentum_summary";
  sport: string;
  entity_type: string;
  entity_id: number;
  /** Resolved season (explicit ?season or the current one). */
  season: number;
  summary: MomentumSummaryVerdict | null;
  scores: MomentumSummaryScores | null;
}

async function fetchMomentumSummaryImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<MomentumSummaryResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  return fetchJsonOrNull<MomentumSummaryResponse>(
    entityProductUrl(sport, type, id, "momentum/summary", season),
    "momentum-summary",
  );
}

export const getMomentumSummary = query(fetchMomentumSummaryImpl, "momentum-summary");
