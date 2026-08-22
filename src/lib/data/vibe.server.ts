/**
 * Vibe product fetcher (/{sport}/{type}/{id}/vibe) — The Influencer's card.
 *
 * This is the "flagged follow-up" VibeCard's own docstring has been carrying
 * since 2026-07-22. Until the backend restored the route on 2026-08-22, the
 * card rode the *Analyst's* momentum payload and read her snapshots out of
 * `vibes.snapshots` — a product hydrating from another character's endpoint,
 * which is why it inherited momentum's cache key, its season param and its
 * fixed 7-day window whether or not any of that suited the Vibe card.
 *
 * The route went missing in the O14 convergence rename, which handed the old
 * per-entity `/vibes` path to the Oracle's `/sigil`. She never stopped writing
 * — `vibe_scores` takes a row on every milestone, periodic and news-spike
 * trigger — so nothing was lost but the door.
 *
 * Shape matches the other voice cards: ONE `current` object carrying
 * `{headline, body}` + the sentiment score, plus the 7-day snapshot window so
 * the card renders from a single request. 200 with `current: null` when the
 * entity has never been scored; 404 → null. Server-bound via "use server".
 *
 * The season-length sentiment sparkline deliberately stays on /momentum: it is
 * a Rating × Vibe trajectory and belongs to the Analyst. This endpoint answers
 * "what is she saying about them right now".
 */

import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

/** The lead read — her latest scored row, at any age (serve-latest). */
export interface VibeCurrent {
  /** Sentiment 1-100. The Influencer's card score. */
  sentiment: number;
  /** Same number under the cross-surface `heat` name (drop 3a contract). */
  heat: number;
  /** Her card title (`vibe_scores.hook`, backend migration 180). Null on
   *  pre-v13 rows, which fall back to the trigger label. */
  headline: string | null;
  /** The felt-read prose (`vibe_scores.prompt` — the same text the vibes
   *  leaderboard serves as `blurb`). Null on marker rows. */
  body: string | null;
  trigger_type: string;
  generated_at: string;
  model_version: string;
  prompt_version: string;
}

/** One read in the 7-day window. Carries its prose: the Vibe card is a feed
 *  ("past week vibe reads, latest first"), not a single-read card, so the
 *  window has to be renderable on its own. Same shape /momentum returned. */
export interface VibeSnapshot {
  sentiment: number;
  generated_at: string;
  trigger_type: string;
  /** Her title for this read (`vibe_scores.hook`). Null on pre-v13 rows —
   *  the card falls back to the trigger label. */
  headline: string | null;
  /** The felt-read prose (`vibe_scores.prompt`). Null on marker rows, which
   *  the card filters out. */
  body: string | null;
}

export interface VibeResponse {
  page: "vibe";
  sport: string;
  entity_type: string;
  entity_id: number;
  /** Her latest scored read, or null when the entity has never been scored. */
  current: VibeCurrent | null;
  /** Fixed at 7 by the backend; carried so the UI never hardcodes it. */
  window_days: number;
  /** Newest first. Empty when nothing landed in the window. */
  snapshots: VibeSnapshot[];
}

async function fetchVibeImpl(
  sport: string,
  type: string,
  id: string,
): Promise<VibeResponse | null> {
  "use server";
  if (!sport || !id) return null;
  return fetchJsonOrNull<VibeResponse>(entityProductUrl(sport, type, id, "vibe"), "vibe");
}

export const getVibe = query(fetchVibeImpl, "vibe");
