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

export interface TrendsEventScore {
  fixture_id: number;
  composite_score: number | null;
  minutes_played: number | null;
  /** UTC ISO-8601 timestamp of the event's kickoff/tipoff. Used by
   *  TrendsCard's Score sparkline to position dots on a true time
   *  axis (rather than evenly spaced) so clusters of games / quiet
   *  stretches read honestly. */
  start_time: string;
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
  /** Per-event composite scores for every played event in the
   *  current season, ordered newest-first (renamed from
   *  `entity_recent_scores` on 2026-05-24 when the backend lifted
   *  the LIMIT 3 cap). Each row's `composite_score` is in [0, 100]
   *  or null when the event has no scored data (DNP-CD / empty
   *  stats blob). `minutes_played` lets future UI disclaim short-
   *  sample readings (no badge in the current sparkline density,
   *  but kept for hover-tooltips). `start_time` powers true time-
   *  axis positioning on the sparkline. */
  entity_event_scores: TrendsEventScore[];
  /** Season-rolled composite for the requesting entity. Null when
   *  the entity has no scored events in scope — the frontend renders
   *  the Score section as a not-enough-data empty state in that case
   *  instead of trying to derive a value from recents. */
  entity_season_score_avg: number | null;
  /** Peer cohort's season composite average — anchor for the
   *  reference line on the recent-scores sparkline. By construction
   *  near the mid-band (it's a mean of per-stat percentile values),
   *  so it doubles as the visual mid-line. */
  peer_season_score_avg: number;
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
