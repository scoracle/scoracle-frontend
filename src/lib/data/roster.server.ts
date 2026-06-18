/**
 * Roster fetcher. Returns every player on a team's season roster with their
 * season Composite + Specialist rating (+ ranks + specialty), ordered by the
 * Composite+Specialist sum. Team entities only.
 *
 * Returns 200 with an empty `players[]` when the team has no rated players in
 * scope; a 404 would be unexpected and is surfaced as null. Server-bound via
 * "use server".
 */

import { query } from "@solidjs/router";
import { rosterUrl } from "../utils/data-sources";

export interface RosterPlayer {
  id: number;
  name: string;
  image: string | null;
  position: string | null;
  /** Season Composite + Specialist z-scores (the values the sum-rank uses). */
  rating_composite: number;
  rating_peak: number;
  rating_peak_label: string;
  /** 0-100 positionless percentiles of the two scores. */
  rating_composite_rank: number;
  rating_peak_rank: number;
  /** Magnitude scores (0-100, ~50 = average, SD 10) — the displayed Rating columns. */
  rating_composite_score: number;
  rating_peak_score: number;
  /** Box-score fantasy points (backend migration 046); null for sports without a
   *  fantasy preset (football pre-FPL). Shown as a roster column for nba/nfl. */
  fantasy_points?: number | null;
  /** 1-based position on the roster board (Composite+Specialist sum, desc). */
  rank: number;
}

export interface RosterResponse {
  page: "roster";
  sport: string;
  team_id: number;
  season: number;
  count: number;
  players: RosterPlayer[];
}

async function fetchRosterImpl(
  sport: string,
  id: string,
  season?: number | null,
): Promise<RosterResponse | null> {
  "use server";
  if (!sport || !id) return null;
  const { url, headers } = rosterUrl(sport, id, season);
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`roster ${res.status}`);
  return (await res.json()) as RosterResponse;
}

export const getRoster = query(fetchRosterImpl, "roster");
