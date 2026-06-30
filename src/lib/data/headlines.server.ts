/**
 * Headlines product fetcher (/{sport}/{type}/{id}/headlines). The entity's
 * breaking-news bulletins — one-sentence blurbs about high-impact, time-sensitive
 * events, filtered to the 2-day window and sorted newest first. Eager-loaded by
 * the News card so scope switching is instant.
 *
 * 200 with empty `headlines` when the entity has none; 404 → null. "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

/** One breaking-news bulletin. */
export interface Headline {
  id: number;
  title: string;
  category: "transfer" | "injury" | "coaching" | "contract" | "other";
  source_url: string | null;
  source_name: string | null;
  published_at: string;
}

export interface HeadlinesResponse {
  page: "headlines";
  sport: string;
  entity_type: string;
  entity_id: number;
  headlines: Headline[];
}

async function fetchHeadlinesImpl(
  sport: string,
  type: string,
  id: string,
): Promise<HeadlinesResponse | null> {
  "use server";
  if (!sport || !id) return null;
  return fetchJsonOrNull<HeadlinesResponse>(entityProductUrl(sport, type, id, "headlines"), "headlines");
}

export const getHeadlines = query(fetchHeadlinesImpl, "headlines");
