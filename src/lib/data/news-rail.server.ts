/**
 * News-rail fetcher (two-rail model). One payload per entity: the latest Gemma
 * narratives (hottest first), the transfer scope (a team's player rumors / a
 * player's interested clubs), and the vibe (current + a bounded history for the
 * sparkline). Consolidates the old split news + vibe + transfers reads — the
 * News card renders the narratives + an All/Transfers scope from this one fetch.
 *
 * 200 with empty arrays when the entity has none yet; 404 → null. "use server".
 */

import { query } from "@solidjs/router";
import { newsRailUrl } from "../utils/data-sources";

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

/**
 * One transfer/trade rumor row in the rail's `transfers` scope. The counterparty
 * is the OTHER entity type: a team's rows are players, a player's rows are clubs.
 */
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
  gemma_summary: string | null;
  source_attribution: string | null;
  /** 1-based rank by heat. */
  rank: number;
}

/** One Gemma storyline — a write-up grounded in its articles, with a deterministic impact. */
export interface RailNarrative {
  narrative_title: string;
  body: string;
  /** 0-100 per-narrative impact (volume × sources × recency); ranks the news leaderboard. */
  impact: number;
  impact_components: Record<string, number>;
  source_attribution: string | null;
  input_news_ids: number[];
  generated_at: string;
}

export interface RailVibeCurrent {
  sentiment: number;
  model_version: string;
  prompt_version: string;
  generated_at: string;
}

export interface RailVibe {
  /** Latest fresh sentiment, or null when none in the freshness window. */
  current: RailVibeCurrent | null;
  /** Up to 14 recent points (newest first) for the trend sparkline. */
  history: { sentiment: number; generated_at: string }[];
}

export interface NewsRailResponse {
  page: "news_rail";
  sport: string;
  entity_type: string;
  entity_id: number;
  narratives: RailNarrative[];
  /** For a team: linked players; for a player: interested clubs. Mirrors TransferRumor. */
  transfers: TransferRumor[];
  vibe: RailVibe;
}

async function fetchNewsRailImpl(
  sport: string,
  type: string,
  id: string,
): Promise<NewsRailResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = newsRailUrl(sport, type, id);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`news-rail ${res.status}`);
  return (await res.json()) as NewsRailResponse;
}

export const getNewsRail = query(fetchNewsRailImpl, "news-rail");
