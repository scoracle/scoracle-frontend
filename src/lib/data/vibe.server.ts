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
  /** Her card title (`vibe_scores.hook`, backend migration 180). Null when
   *  the title guard dropped it — the card then serves an older complete read
   *  (leadVibeRead), never a bookkeeping label. */
  headline: string | null;
  /** The felt-read prose (`vibe_scores.prompt` — the same text the vibes
   *  leaderboard serves as `blurb`). Null on marker rows. */
  body: string | null;
  trigger_type: string;
  generated_at: string;
  model_version: string;
  prompt_version: string;
}

/** One read in the 7-day window. The card is serve-latest (leadVibeRead picks
 *  the newest COMPLETE read); the window exists so that selection, the ring
 *  score, and any future sparkline ride one payload. */
export interface VibeSnapshot {
  sentiment: number;
  generated_at: string;
  trigger_type: string;
  /** Her title for this read (`vibe_scores.hook`). Null when the guard
   *  dropped it; leadVibeRead skips past hookless reads when it can. */
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

/** The read the card serves (2026-09-06, the hook-completeness rule): a card
 *  face is hook + body, so the lead is the newest COMPLETE read — falling back
 *  to the newest with a body only when the window holds no complete one (a
 *  hookless face beats an empty card). ONE selector, shared by VibeCard and
 *  deck-scores, so the ring's number can never disagree with the served prose. */
export function leadVibeRead(snapshots: VibeSnapshot[] | undefined): VibeSnapshot | undefined {
  const newest = [...(snapshots ?? [])].sort((a, b) =>
    b.generated_at.localeCompare(a.generated_at),
  );
  return newest.find((r) => r.body && r.headline) ?? newest.find((r) => r.body);
}
