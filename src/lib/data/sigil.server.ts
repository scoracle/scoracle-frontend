/**
 * Sigil product fetcher (/{sport}/{type}/{id}/sigil). The entity's crown
 * synthesis — ONE `current` object carrying the decided score AND its Oracle
 * voice (reading/omen/voiced_at) — plus a bounded history for the trend
 * sparkline. Read by the Sigil card AND the meta corner score (EntityMeta
 * reads `.current.score`).
 *
 * Backed by sigil_synthesis: decide-then-voice persists one row (Session B),
 * served whole at any age (serve-latest; Session C folded the old `oracle`
 * payload key into `current`).
 *
 * 200 with `current: null` / empty `history` when never scored; 404 → null.
 * Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

/**
 * ONE product object (Session C of the sigil-pipeline cleanup, 2026-07-16): the
 * decided synthesis carries its own Oracle voice — no separate `oracle` payload
 * key, and the synthesis blurb (internal scaffolding) is never served.
 */
export interface SigilCurrent {
  /** Holistic synthesis score (1-100). */
  score: number;
  /** Convergence diagnostic of the decided card. */
  convergence: number | null;
  /** Previous score before this synthesis run; null if this is the first. */
  previous_score: number | null;
  /** The Oracle's tweet-sized hook (the card contract, mig 232) — the card's
   *  title line. Null for rows voiced before the rollout. */
  headline?: string | null;
  /** 2-4 sentence Oracle reading — the card's voice. Null only when the entity
   *  has never been voiced (the served row always carries its current voice,
   *  fresh or carried forward). */
  reading: string | null;
  /** Computed omen, closed set: ascendant | steady | waning | crossroads. */
  omen: string | null;
  /** When the reading was actually DRAWN — the timestamp the credit renders.
   *  Older than generated_at on carried-forward voices, by design. */
  voiced_at: string | null;
  voice_model_version: string | null;
  voice_prompt_version: string | null;
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
  /** Latest REAL synthesis at any age (serve-latest), or null when the entity
   *  has never been scored. Carries the Oracle voice fields. */
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
  return fetchJsonOrNull<SigilResponse>(entityProductUrl(sport, type, id, "sigil"), "vibes");
}

export const getSigil = query(fetchSigilImpl, "sigil");
