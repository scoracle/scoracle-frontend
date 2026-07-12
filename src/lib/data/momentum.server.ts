/**
 * Trends fetcher. Combines last-3-event stat averages + 7-day vibe series
 * for one entity. Endpoint always returns 200 (entity existence is the
 * profile endpoint's job) — a 404 here is unexpected, so we surface it
 * as null and let the card render its empty state. Server-bound via
 * "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

export interface MomentumVibeSnapshot {
  sentiment: number;
  generated_at: string;
  trigger_type: string;
  /** The felt-read blurb (vibe_scores.prompt — the same text the vibes
   *  leaderboard serves as `blurb`). Null on legacy rows. */
  blurb: string | null;
}

export interface MomentumSentimentSeriesDay {
  /** UTC day, ISO date string (YYYY-MM-DD). */
  date: string;
  /** Mean of that day's snapshot sentiments, integer 0-100. */
  sentiment_avg: number;
  /** Number of snapshots that fed the average — surfaced for a
   *  future hover-tooltip ("4 snapshots that day"). */
  snapshot_count: number;
}

export interface MomentumEventScore {
  fixture_id: number;
  composite_score: number | null;
  minutes_played: number | null;
  /** UTC ISO-8601 timestamp of the event's kickoff/tipoff. Used by
   *  MomentumCard's Score sparkline to position dots on a true time
   *  axis (rather than evenly spaced) so clusters of games / quiet
   *  stretches read honestly. */
  start_time: string;
}

export interface MomentumResponse {
  page: "momentum";
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
  entity_event_scores: MomentumEventScore[];
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
  /** All-time historical percentile for this entity's season composite
   *  (0-100, higher = better) — the trends-payload mirror of the
   *  profile meta's `season_composite_rank_alltime`. Same era-fair
   *  "best seasons ever recorded" number, refreshed nightly. Typed for
   *  parity / future in-Card use; nothing in MomentumCard consumes this
   *  yet. Null when the entity has no eligible season stats. */
  entity_alltime_score_rank: number | null;
  vibes: {
    window_days: number;
    snapshots: MomentumVibeSnapshot[];
  };
  /** Daily-averaged sentiment series for the Trends sentiment sparkline. One
   *  row per UTC day with at least one snapshot — days with zero
   *  snapshots are omitted server-side so the sparkline renders
   *  quiet stretches as honest gaps. Anchored at the first kickoff
   *  of the most-recently-started season in the sport+league scope;
   *  during the offseason it stays pinned at the previous season's
   *  anchor so off-day sentiment activity carries through. Two entities
   *  in the same scope share the same date axis, so future side-by-
   *  side compare surfaces align naturally. */
  entity_season_sentiment_series: MomentumSentimentSeriesDay[];
  meta: {
    season: number;
    league_id: number | null;
    position: string | null;
  };
}

async function fetchMomentumImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<MomentumResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  return fetchJsonOrNull<MomentumResponse>(entityProductUrl(sport, type, id, "momentum", season), "trends");
}

export const getMomentum = query(fetchMomentumImpl, "momentum");
