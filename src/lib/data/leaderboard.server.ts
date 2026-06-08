/**
 * Leaderboard (rating board) fetcher. Returns the positionless z-score rating
 * board for a sport — one payload carrying BOTH the Composite and Specialist
 * score (+ specialty label + ranks) per entity, so a single fetch feeds the
 * board, the meta card, and the per-row sparkline link.
 *
 * The endpoint returns 200 with an empty `leaders[]` when nothing is rated in
 * scope; a 404 would be unexpected and is surfaced as null. Server-bound via
 * "use server".
 */

import { query } from "@solidjs/router";
import {
  leaderboardUrl,
  vibesLeaderboardUrl,
  transfersLeaderboardUrl,
} from "../utils/data-sources";

/** One ranked entity on the board. Player rows carry `position`; team rows
 *  set it null but reuse the team_* fields self-referentially. */
export interface LeaderboardEntry {
  entity_type: string;
  id: number;
  name: string;
  image: string | null;
  position: string | null;
  team_id: number | null;
  team_name: string | null;
  team_code: string | null;
  team_logo: string | null;
  league_id: number | null;
  rating_composite: number;
  rating_specialist: number;
  /** Strongest specialty label for this entity (e.g. "Rim Protection"). */
  rating_specialty: string;
  /** All-time percentiles (0-100, higher = better). */
  rating_composite_rank: number;
  rating_specialist_rank: number;
  /** 1-based position on the *current* board (respects the active scope sort). */
  rank: number;
}

export interface LeaderboardResponse {
  page: "leaderboard";
  sport: string;
  entity_type: string;
  /** The season this board reflects (the requested one, or the latest rated). */
  season: number;
  /** Every season with a composite rating for this sport+entity_type, newest
   *  first — powers the leaderboard's season dropdown. */
  available_seasons: number[];
  /** Active board: "composite", "specialist", or a specialty label. */
  scope: string;
  count: number;
  leaders: LeaderboardEntry[];
}

async function fetchLeaderboardImpl(
  sport: string,
  entityType?: string,
  scope?: string,
  season?: number | null,
  limit?: number,
  position?: string | null,
  leagueId?: number | null,
  conference?: string | null,
  division?: string | null,
): Promise<LeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  const { url, headers } = leaderboardUrl(sport, entityType, scope, season, limit, {
    position, leagueId, conference, division,
  });
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return (await res.json()) as LeaderboardResponse;
}

export const getLeaderboard = query(fetchLeaderboardImpl, "leaderboard");

/* ─── Sport-wide non-rating boards (vibes / news / transfers) ──────────────────
   These share one enriched single-entity row shape (vibes + news), plus the
   transfer board's pair shape. All sport-scoped (no per-entity context), so they
   power the standalone /leaderboard page's board rail. */

/** One row on the vibes/news boards. `score` = latest sentiment (vibes) or the
 *  mention count (news). Players carry team_* via their current team; teams
 *  self-reference. */
export interface BoardEntry {
  entity_type: string;
  id: number;
  name: string;
  image: string | null;
  team_id: number | null;
  team_name: string | null;
  team_code: string | null;
  team_logo: string | null;
  score: number;
  rank: number;
}

export interface VibesLeaderboardResponse {
  page: "vibes_leaderboard";
  sport: string;
  entity_type: string;
  count: number;
  leaders: BoardEntry[];
}

/** One row on the transfers board — a (player → team) rumor with its heat. */
export interface TransferLeader {
  player_id: number;
  player_name: string;
  player_image: string | null;
  team_id: number;
  team_name: string;
  team_code: string | null;
  team_logo: string | null;
  heat: number;
  direction: string | null;
  stage: string | null;
  gemma_summary: string | null;
  rank: number;
}

export interface TransfersLeaderboardResponse {
  page: "transfers_leaderboard";
  sport: string;
  count: number;
  rumors: TransferLeader[];
}

async function fetchVibesLeaderboardImpl(
  sport: string,
  entityType?: string,
  limit?: number,
): Promise<VibesLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  const { url, headers } = vibesLeaderboardUrl(sport, entityType, limit);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`vibes leaderboard ${res.status}`);
  return (await res.json()) as VibesLeaderboardResponse;
}

async function fetchTransfersLeaderboardImpl(
  sport: string,
  limit?: number,
): Promise<TransfersLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  const { url, headers } = transfersLeaderboardUrl(sport, limit);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`transfers leaderboard ${res.status}`);
  return (await res.json()) as TransfersLeaderboardResponse;
}

export const getVibesLeaderboard = query(fetchVibesLeaderboardImpl, "vibes-leaderboard");
export const getTransfersLeaderboard = query(fetchTransfersLeaderboardImpl, "transfers-leaderboard");
