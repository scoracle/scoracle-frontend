/**
 * Vibes product fetcher (/{sport}/{type}/{id}/vibes). The entity's current vibe
 * sentiment plus a bounded history for the trend sparkline. The single vibe
 * product — read by the Vibe card AND the meta corner score (EntityMeta reads
 * `.current.sentiment`).
 *
 * 200 with `current: null` / empty `history` when none in the window; 404 → null.
 * Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";

export interface VibeCurrent {
  /** Latest fresh sentiment (1-100). */
  sentiment: number;
  model_version: string;
  prompt_version: string;
  generated_at: string;
}

export interface VibePoint {
  sentiment: number;
  generated_at: string;
}

export interface VibesResponse {
  page: "vibes";
  sport: string;
  entity_type: string;
  entity_id: number;
  /** Latest fresh sentiment, or null when none in the freshness window. */
  current: VibeCurrent | null;
  /** Up to 14 recent points (newest first) for the trend sparkline. */
  history: VibePoint[];
}

async function fetchVibesImpl(
  sport: string,
  type: string,
  id: string,
): Promise<VibesResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = entityProductUrl(sport, type, id, "vibes");
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`vibes ${res.status}`);
  return (await res.json()) as VibesResponse;
}

export const getVibes = query(fetchVibesImpl, "vibes");
