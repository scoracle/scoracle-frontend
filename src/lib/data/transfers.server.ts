/**
 * Transfers product fetcher (/{sport}/{type}/{id}/transfers?scope=...). The
 * entity's vetted transfer/trade rumors ranked by deterministic heat — the
 * scoped transfer facet of the News hub. The counterparty is the OTHER entity
 * type: a team's rows are players, a player's rows are clubs.
 *
 * 200 with empty `transfers` when the entity has none; 404 → null. "use server".
 */

import { query } from "@solidjs/router";
import type { NewsScope } from "../../contexts/profile";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";
import type { NewsTimeScope, NewsTrajectory, NewsTrajectoryComponents } from "./news.server";

/** Transparent heat breakdown (mirrors the rating_breakdown philosophy). */
export interface TransferHeatComponents {
  distinct_sources?: number;
  recent_3d?: number;
  total_14d?: number;
  newest_age_hours?: number;
  tier_weight?: number;
  volume?: number;
  recency?: number;
  recent_frac?: number;
}

/** One transfer/trade rumor row — the counterparty (the OTHER entity type). */
export interface TransferRumor {
  /** Counterparty id — links to that entity's profile. */
  id: number;
  name: string;
  image: string | null;
  /** 0-100 deterministic heat. */
  heat: number;
  heat_components: TransferHeatComponents;
  /** Gemma vetting. */
  direction: "incoming" | "outgoing" | "unclear" | null;
  stage: "speculation" | "concrete_interest" | "advanced_talks" | "here_we_go" | null;
  /** Current backend field. */
  summary: string | null;
  /** Back-compat with rows generated before the transfer summary rename. */
  gemma_summary?: string | null;
  source_attribution: string | null;
  updated_at: string | null;
  source_count: number;
  source_names: string[];
  source_latest_at: string | null;
  source_oldest_at: string | null;
  trajectory: NewsTrajectory | null;
  trajectory_label: string | null;
  trajectory_components: NewsTrajectoryComponents;
  /** 1-based rank by heat. */
  rank: number;
}

export interface TransfersResponse {
  page: "transfers";
  sport: string;
  entity_type: string;
  entity_id: number;
  scope: NewsTimeScope;
  transfers: TransferRumor[];
  /** The Insider's card score (1-99 busyness) — latest wire wrap, scope-independent.
   *  Optional: pre-rollout responses omit it; null until the entity's board is scored. */
  card_score?: number | null;
  /** The Insider's entity-level card hook (score + headline + body contract, backend
   *  mig 232/is5): his tweet-style read of the whole wire — a quiet wire is a real
   *  headline, not a missing one. Null until the entity's wire re-wraps under is5. */
  headline?: string | null;
}

async function fetchTransfersImpl(
  sport: string,
  type: string,
  id: string,
  scope?: NewsScope,
): Promise<TransfersResponse | null> {
  "use server";
  if (!sport || !id) return null;
  return fetchJsonOrNull<TransfersResponse>(entityProductUrl(sport, type, id, "transfers", null, scope), "transfers");
}

export const getTransfers = query(fetchTransfersImpl, "transfers");
