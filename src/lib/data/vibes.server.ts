/**
 * Vibes product fetcher (/{sport}/{type}/{id}/vibes). The entity's current vibe
 * synthesis score plus a bounded history for the trend sparkline. The single vibe
 * product — read by the Vibe card AND the meta corner score (EntityMeta reads
 * `.current.score`).
 *
 * Backed by vibe_synthesis (Phase B) — a holistic three-pillar score (news narrative
 * + Sigil identity + momentum) plus a short prose blurb.
 *
 * 200 with `current: null` / empty `history` when none in the window; 404 → null.
 * Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";

export interface VibeCurrent {
  /** Holistic synthesis score (1-100). */
  score: number;
  /** 1-2 sentence prose blurb synthesizing the three pillars. Null for pre-B rows. */
  blurb: string | null;
  /** Previous score before this synthesis run; null if this is the first. */
  previous_score: number | null;
  model_version: string;
  prompt_version: string;
  generated_at: string;
}

export interface VibePoint {
  score: number;
  generated_at: string;
}

export interface VibesResponse {
  page: "vibes";
  sport: string;
  entity_type: string;
  entity_id: number;
  /** Latest fresh synthesis, or null when none in the freshness window. */
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
