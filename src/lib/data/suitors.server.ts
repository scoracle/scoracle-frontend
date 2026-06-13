/**
 * Suitors fetcher — the player-side mirror of transfers. The TEAMS linked with a
 * player ("who's after them") ranked by the deterministic heat index, each row
 * carrying Gemma's direction / stage / grounded summary + the cited source.
 * Player entities only.
 *
 * 200 with empty `suitors[]` when the player has no live links; a 404 would be
 * unexpected and is surfaced as null. Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { suitorsUrl } from "../utils/data-sources";
import type { TransferHeatComponents } from "./transfers.server";

/** One suitor: a team linked with the player. Mirrors TransferRumor on the team axis. */
export interface PlayerSuitor {
  /** Team id — links to the suitor team's profile. */
  id: number;
  name: string;
  image: string | null;
  /** 0-100 deterministic heat. */
  heat: number;
  heat_components: TransferHeatComponents;
  /** Gemma vetting. */
  direction: "incoming" | "outgoing" | "unclear" | null;
  stage: "speculation" | "concrete_interest" | "advanced_talks" | "here_we_go" | null;
  gemma_summary: string | null;
  source_attribution: string | null;
  /** 1-based rank by heat. */
  rank: number;
}

export interface SuitorsResponse {
  page: "suitors";
  sport: string;
  player_id: number;
  count: number;
  suitors: PlayerSuitor[];
}

async function fetchSuitorsImpl(sport: string, id: string): Promise<SuitorsResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = suitorsUrl(sport, id);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`suitors ${res.status}`);
  return (await res.json()) as SuitorsResponse;
}

export const getSuitors = query(fetchSuitorsImpl, "suitors");
