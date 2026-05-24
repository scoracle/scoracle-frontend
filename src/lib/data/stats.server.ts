/**
 * Stats fetcher — server-side via SolidStart's "use server" directive
 * applied at function level. StatsCard + CompareCard + TraitsCard +
 * EntityMeta all call `getStats(sport, type, id, season?)`; query()
 * dedupes by [name, ...args] hash so the request fires once per
 * (sport,type,id,season) per page-view, shared across consumers.
 *
 * `season` is optional: passing `null` or `undefined` lets the backend
 * serve the entity's most recent season and reports the resolved value
 * back via `meta.season`. Picking a specific season requires that it
 * appears in the previous response's `meta.available_seasons` — the
 * backend will 404 / fall back if not, per ENDPOINTS.md.
 */

import { query } from "@solidjs/router";
import { entityUrl, unwrapEntityPayload } from "../utils/data-sources";

export interface PercentileMetadata {
  position_group?: string | null;
  sample_size?: number | null;
}

export interface ScopedPercentileMetadata extends PercentileMetadata {
  scope_type?: "conference" | "league" | string | null;
  scope_id?: string | number | null;
  scope_name?: string | null;
}

/* Envelope-level metadata the profile endpoint ships alongside the
 * entity payload. `available_seasons` powers the season selector — it
 * lists every season this entity has stats for, newest first, scoped
 * to the current league. `season` is the one the backend resolved this
 * response to (echo of `?season=` when provided, else newest). */
export interface StatsResponseMeta {
  season: number | null;
  available_seasons: number[];
  league_id: number | null;
  /** Backend's authoritative season composite score for this entity in
   *  [0, 100]. Same percentile-pooled aggregate the TrendsCard Score
   *  section publishes — surfaced on the meta envelope so EntityMeta
   *  can render the headline rating chip without a second fetch.
   *  Null when the entity has no scored events in scope. */
  season_composite_score?: number | null;
}

export interface StatsResponse {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  season: number | null;
  stats: Record<string, number | string> | null;
  percentiles: Record<string, number> | Array<{ stat_key: string; percentile: number }> | null;
  percentile_metadata?: PercentileMetadata | null;
  scoped_percentiles?: Record<string, number> | Array<{ stat_key: string; percentile: number }> | null;
  scoped_percentile_metadata?: ScopedPercentileMetadata | null;
  meta?: StatsResponseMeta;
}

async function fetchStatsImpl(
  sport: string,
  type: string,
  id: string,
  season?: number | null,
): Promise<StatsResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = entityUrl(sport, type, id, season);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`stats ${res.status}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const data = unwrapEntityPayload<StatsResponse>(raw) ?? (raw as unknown as StatsResponse);
  if (!data?.stats) return null;
  // Surface the envelope's `meta` onto the returned entity so callers
  // can read `data.meta.available_seasons` without re-shaping. The
  // entity row already carries its own `season` field — keep it; meta
  // adds the selector context.
  const envelopeMeta = (raw as { meta?: StatsResponseMeta }).meta;
  return envelopeMeta ? { ...data, meta: envelopeMeta } : data;
}

export const getStats = query(fetchStatsImpl, "stats");
