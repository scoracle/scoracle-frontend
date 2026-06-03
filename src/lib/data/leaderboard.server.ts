/**
 * Leaderboard (rating board) fetcher. Returns the positionless z-score rating
 * board for a sport — one payload carrying BOTH the Composite and Specialist
 * score (+ specialty label + ranks) per entity, so a single fetch feeds the
 * board, the meta card, and the per-row starline link.
 *
 * The endpoint returns 200 with an empty `leaders[]` when nothing is rated in
 * scope; a 404 would be unexpected and is surfaced as null. Server-bound via
 * "use server".
 */

import { query } from "@solidjs/router";
import { leaderboardUrl } from "../utils/data-sources";

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
  season: number;
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
