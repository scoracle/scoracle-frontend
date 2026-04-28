/**
 * Stats fetcher — server-side via SolidStart's "use server" directive
 * applied at function level. StatsTab + CompareTab + TraitsTab all call
 * `getStats(sport, type, id)`; query() dedupes so the request fires once
 * per (sport,type,id) per page-view, and the result is shared across
 * the three consumers.
 */

import { query } from "@solidjs/router";
import { entityUrl, unwrapEntityPayload } from "../utils/data-sources";

export interface StatsResponse {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  season: number | null;
  stats: Record<string, number | string> | null;
  percentiles: Record<string, number> | Array<{ stat_key: string; percentile: number }> | null;
}

async function fetchStatsImpl(
  sport: string,
  type: string,
  id: string,
): Promise<StatsResponse | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = entityUrl(sport, type, id);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`stats ${res.status}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const data = unwrapEntityPayload<StatsResponse>(raw) ?? (raw as unknown as StatsResponse);
  return data?.stats ? data : null;
}

export const getStats = query(fetchStatsImpl, "stats");
