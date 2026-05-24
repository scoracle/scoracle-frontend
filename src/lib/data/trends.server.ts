/**
 * Trends fetcher. Combines last-3-event stat averages + 7-day vibe series
 * for one entity. Endpoint always returns 200 (entity existence is the
 * profile endpoint's job) — a 404 here is unexpected, so we surface it
 * as null and let the card render its empty state. Server-bound via
 * "use server".
 */

import { query } from "@solidjs/router";
import { trendsUrl } from "../utils/data-sources";

export interface TrendsVibeSnapshot {
  sentiment: number;
  generated_at: string;
  trigger_type: string;
}

export interface TrendsResponse {
  page: "trends";
  sport: string;
  entity_type: string;
  entity_id: number;
  window: {
    games_used: number;
    fixture_ids: number[];
    spans_prior_season: boolean;
  };
  entity_recent_avgs: Record<string, number>;
  entity_season_avgs: Record<string, number>;
  peer_season_avgs: Record<string, number>;
  peer_cohort_size: number;
  vibes: {
    window_days: number;
    snapshots: TrendsVibeSnapshot[];
  };
  meta: {
    season: number;
    league_id: number | null;
    position: string | null;
  };
}

async function fetchTrendsImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<TrendsResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = trendsUrl(sport, type, id, season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`trends ${res.status}`);
  return (await res.json()) as TrendsResponse;
}

export const getTrends = query(fetchTrendsImpl, "trends");
