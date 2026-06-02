/**
 * Transfers/Trades fetcher. A team's rumor-linked players ranked by the
 * deterministic heat index (transparent components attached). Once Gemma vetting
 * lands, each row also carries direction / stage / a grounded summary + the
 * cited source. Team entities only.
 *
 * 200 with empty `rumors[]` when the team has no live rumors; a 404 would be
 * unexpected and is surfaced as null. Server-bound via "use server".
 */

import { query } from "@solidjs/router";
import { transfersUrl } from "../utils/data-sources";

/** Transparent heat breakdown (mirrors the rating_breakdown philosophy). */
export interface TransferHeatComponents {
  distinct_sources?: number;
  recent_3d?: number;
  total_14d?: number;
  newest_age_hours?: number;
  tier_weight?: number;
  volume?: number;
  recency?: number;
  recent_frac?: number;
}

export interface TransferRumor {
  /** Player id — links to the player profile (their Specialist = "what they'd bring"). */
  id: number;
  name: string;
  image: string | null;
  /** 0-100 deterministic heat. */
  heat: number;
  heat_components: TransferHeatComponents;
  /** Gemma vetting (null until Phase 2 lands). */
  direction: "incoming" | "outgoing" | "unclear" | null;
  stage: "speculation" | "concrete_interest" | "advanced_talks" | "here_we_go" | null;
  gemma_summary: string | null;
  source_attribution: string | null;
  /** 1-based rank by heat. */
  rank: number;
}

export interface TransfersResponse {
  page: "transfers";
  sport: string;
  team_id: number;
  count: number;
  rumors: TransferRumor[];
}

async function fetchTransfersImpl(sport: string, id: string): Promise<TransfersResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = transfersUrl(sport, id);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`transfers ${res.status}`);
  return (await res.json()) as TransfersResponse;
}

export const getTransfers = query(fetchTransfersImpl, "transfers");
