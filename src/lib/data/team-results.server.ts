/**
 * Team results fetcher — finalized scorelines for one team in one season.
 *
 * Reads /api/v1/{sport}/team/{id}/results?season=… (see scoracle-backend
 * ENDPOINTS.md §Results). Returns the full response envelope so callers
 * can read `meta.games_played` without re-counting.
 *
 * Players don't have a record — callers should gate by entity type before
 * calling. A 404 surfaces as `null` so the card can render its empty state.
 */

import { query } from "@solidjs/router";
import { teamResultsUrl } from "../utils/data-sources";

export interface TeamResultOpponent {
  id: number | null;
  name: string | null;
  short_code: string | null;
  logo_url: string | null;
}

export interface TeamResultGame {
  fixture_id: number;
  start_time: string;
  status: "completed" | "seeded";
  round: string | null;
  home_away: "home" | "away";
  team_score: number;
  opponent_score: number;
  result: "W" | "L" | "D" | null;
  opponent: TeamResultOpponent;
}

export interface TeamResultsResponse {
  page: "results";
  sport: string;
  team_id: number;
  results: TeamResultGame[];
  meta: {
    season: number;
    league_id: number | null;
    games_played: number;
  };
}

async function fetchTeamResultsImpl(
  sport: string,
  id: string,
  season?: number | null,
): Promise<TeamResultsResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = teamResultsUrl(sport, id, season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`team-results ${res.status}`);
  return (await res.json()) as TeamResultsResponse;
}

export const getTeamResults = query(fetchTeamResultsImpl, "team-results");
