/**
 * News product fetcher (/{sport}/{type}/{id}/news). The entity's latest Gemma
 * narratives (hottest first by per-narrative impact). News is a post-transfers
 * pipeline layer, so the narratives already carry transfer context — transfers
 * are their own product now (getTransfers).
 *
 * 200 with empty `narratives` when the entity has none yet; 404 → null. "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

/** One Gemma storyline — a write-up grounded in its articles, with a deterministic impact. */
export interface Narrative {
  narrative_title: string;
  body: string;
  /** 0-100 per-narrative impact (volume × sources × recency); ranks the news leaderboard. */
  impact: number;
  impact_components: Record<string, number>;
  source_attribution: string | null;
  input_news_ids: number[];
  generated_at: string;
}

export interface NewsResponse {
  page: "news";
  sport: string;
  entity_type: string;
  entity_id: number;
  narratives: Narrative[];
}

async function fetchNewsImpl(
  sport: string,
  type: string,
  id: string,
): Promise<NewsResponse | null> {
  "use server";
  if (!sport || !id) return null;
  return fetchJsonOrNull<NewsResponse>(entityProductUrl(sport, type, id, "news"), "news");
}

export const getNews = query(fetchNewsImpl, "news");
