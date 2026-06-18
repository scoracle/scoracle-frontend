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

export interface SigilCurrent {
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

export interface SigilPoint {
  score: number;
  generated_at: string;
}

export interface SigilResponse {
  page: "sigil";
  sport: string;
  entity_type: string;
  entity_id: number;
  /** Latest fresh synthesis, or null when none in the freshness window. */
  current: SigilCurrent | null;
  /** Up to 14 recent points (newest first) for the trend sparkline. */
  history: SigilPoint[];
}

async function fetchSigilImpl(
  sport: string,
  type: string,
  id: string,
): Promise<SigilResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = entityProductUrl(sport, type, id, "sigil");
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`vibes ${res.status}`);
  return (await res.json()) as SigilResponse;
}

export const getSigil = query(fetchSigilImpl, "sigil");
