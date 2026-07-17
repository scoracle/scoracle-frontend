/**
 * Leaderboard (rating board) fetcher. Returns the positionless z-score rating
 * board for a sport — one payload carrying BOTH the Composite and peak
 * score (+ peak label + ranks) per entity, so a single fetch feeds the
 * board, the meta card, and the per-row sparkline link.
 *
 * The endpoint returns 200 with an empty `leaders[]` when nothing is rated in
 * scope; a 404 would be unexpected and is surfaced as null. Server-bound via
 * "use server".
 */

import { query } from "@solidjs/router";
import type { NewsScope } from "../../contexts/profile";
import {
  leaderboardUrl,
  vibesLeaderboardUrl,
  sigilLeaderboardUrl,
  trendingLeaderboardUrl,
  newsLeaderboardUrl,
  transfersLeaderboardUrl,
} from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";
import type { NewsTimeScope, NewsTrajectory, NewsTrajectoryComponents } from "./news.server";

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
  rating_composite: number | null;
  rating_peak: number | null;
  /** Strongest peak label for this entity (e.g. "Rim Protection"). */
  rating_peak_label: string | null;
  /** All-time percentiles (0-100, higher = better). */
  rating_composite_rank: number | null;
  rating_peak_rank: number | null;
  /** Magnitude scores (0-100, ~50 = average, SD 10) — the displayed Rating. */
  rating_composite_score: number | null;
  rating_peak_score: number | null;
  /** PLAYERS, Fantasy board (backend migration 046): box-score fantasy points and
   *  its positionless percentile. Null on non-fantasy boards / teams / sports w/o a preset. */
  fantasy_points?: number | null;
  fantasy_rank?: number | null;
  /** 1-based position on the *current* board (respects the active scope sort). */
  rank: number | null;
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
  /** Active board: "composite", "sigil", or a sigil label. */
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
  teamId?: number | null,
  positionGroup?: string | null,
): Promise<LeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<LeaderboardResponse>(
    leaderboardUrl(sport, entityType, scope, season, limit, {
      position, leagueId, conference, division, teamId, positionGroup,
    }),
    "leaderboard",
  );
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

/** One row on the VIBE board — the Vibe end product surfaced on the leaderboard
 *  (its only public surface; the Vibe has no profile card). `score` = latest
 *  sentiment (1-100); `blurb` = the Vibe's felt-read prompt (null until v6 backfill). */
export interface VibeLeader extends BoardEntry {
  blurb: string | null;
}

export interface VibesLeaderboardResponse {
  page: "vibes_leaderboard";
  sport: string;
  entity_type: string;
  count: number;
  leaders: VibeLeader[];
}

/** One row on the SIGIL board. Prose is the Oracle READING (Session C of the
 *  sigil-pipeline cleanup — the synthesis blurb is internal scaffolding, never
 *  served); clients clamp to the first line. Null on rows that predate the
 *  voice (explicit past seasons). */
export interface SigilLeader extends BoardEntry {
  previous_score: number | null;
  reading: string | null;
}

export interface SigilLeaderboardResponse {
  page: "sigil_leaderboard";
  sport: string;
  entity_type: string;
  season: number;
  count: number;
  leaders: SigilLeader[];
}

/** One row on the NEWS board — an entity's hottest current narrative. Extends the
 *  enriched board row with the narrative headline + write-up; `score` = impact. */
export interface NewsLeader extends BoardEntry {
  narrative_title: string;
  body: string;
  updated_at: string | null;
  source_count: number;
  source_names: string[];
  source_latest_at: string | null;
  source_oldest_at: string | null;
  trajectory: NewsTrajectory | null;
  trajectory_label: string | null;
  trajectory_components: NewsTrajectoryComponents;
}

export interface NewsLeaderboardResponse {
  page: "news_leaderboard";
  sport: string;
  entity_type: string;
  scope: NewsTimeScope;
  count: number;
  leaders: NewsLeader[];
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
  summary: string | null;
  gemma_summary: string | null;
  updated_at: string | null;
  source_count: number;
  source_names: string[];
  source_latest_at: string | null;
  source_oldest_at: string | null;
  trajectory: NewsTrajectory | null;
  trajectory_label: string | null;
  trajectory_components: NewsTrajectoryComponents;
  rank: number;
}

export interface TransfersLeaderboardResponse {
  page: "transfers_leaderboard";
  sport: string;
  scope: NewsTimeScope;
  count: number;
  rumors: TransferLeader[];
}

/** One row on the Momentum board (legacy payload page: trending_leaderboard):
 *  `score` = the recent delta (latest − earliest) of the chosen trajectory
 *  (vibe sentiment or composite rating). Signed: negative on the fallers board. */
export interface TrendingLeader extends BoardEntry {
  slope: number;
}

export interface TrendingLeaderboardResponse {
  page: "trending_leaderboard";
  metric: "vibe" | "rating";
  sport: string;
  entity_type: string;
  count: number;
  leaders: TrendingLeader[];
}

async function fetchVibesLeaderboardImpl(
  sport: string,
  entityType?: string,
  limit?: number,
  leagueId?: number | null,
  teamId?: number | null,
  position?: string | null,
  positionGroup?: string | null,
  conference?: string | null,
  division?: string | null,
): Promise<VibesLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<VibesLeaderboardResponse>(
    vibesLeaderboardUrl(sport, entityType, limit, {
      leagueId, teamId, position, positionGroup, conference, division,
    }),
    "vibes leaderboard",
  );
}

async function fetchSigilLeaderboardImpl(
  sport: string,
  entityType?: string,
  limit?: number,
  season?: number | null,
  leagueId?: number | null,
  teamId?: number | null,
  position?: string | null,
  positionGroup?: string | null,
  conference?: string | null,
  division?: string | null,
): Promise<SigilLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<SigilLeaderboardResponse>(
    sigilLeaderboardUrl(sport, entityType, limit, season, {
      leagueId, teamId, position, positionGroup, conference, division,
    }),
    "sigil leaderboard",
  );
}

async function fetchTransfersLeaderboardImpl(
  sport: string,
  limit?: number,
  scope?: NewsScope,
  teamId?: number | null,
): Promise<TransfersLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<TransfersLeaderboardResponse>(
    transfersLeaderboardUrl(sport, limit, scope, { teamId }),
    "transfers leaderboard",
  );
}

async function fetchNewsLeaderboardImpl(
  sport: string,
  entityType?: string,
  limit?: number,
  scope?: NewsScope,
  leagueId?: number | null,
  teamId?: number | null,
  position?: string | null,
  positionGroup?: string | null,
  conference?: string | null,
  division?: string | null,
): Promise<NewsLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<NewsLeaderboardResponse>(
    newsLeaderboardUrl(sport, entityType, limit, scope, {
      leagueId, teamId, position, positionGroup, conference, division,
    }),
    "news leaderboard",
  );
}

async function fetchTrendingLeaderboardImpl(
  sport: string,
  metric?: string,
  entityType?: string,
  limit?: number,
  leagueId?: number | null,
  teamId?: number | null,
  position?: string | null,
  positionGroup?: string | null,
  conference?: string | null,
  division?: string | null,
  direction?: "up" | "down",
): Promise<TrendingLeaderboardResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<TrendingLeaderboardResponse>(
    trendingLeaderboardUrl(sport, metric, entityType, limit, {
      leagueId, teamId, position, positionGroup, conference, division,
    }, direction),
    "trending leaderboard",
  );
}

/* ─── Home movers — the crystal ball's cycle ─────────────────────────────────
   Per sport × metric, the single biggest riser and faller off the momentum
   board, flattened into one list the home hero can cycle through. Fanned out
   server-side so the client pays one round trip. */

export interface HomeMover {
  sport: string;
  entity_type: string;
  id: number;
  name: string;
  image: string | null;
  team_logo: string | null;
  metric: "vibe" | "rating";
  /** Signed momentum delta (score off the movers board): + riser, − faller. */
  delta: number;
}

const MOVER_METRICS = ["vibe", "rating"] as const;
const MOVER_DIRECTIONS = ["up", "down"] as const;

async function fetchHomeMoversImpl(sports: string[]): Promise<HomeMover[]> {
  "use server";
  // Sport-paired order: each sport tells "vibe riser, vibe faller, rating
  // riser, rating faller" before the ball moves on to the next sport.
  const combos = sports.flatMap((sport) =>
    MOVER_METRICS.flatMap((metric) =>
      MOVER_DIRECTIONS.map((direction) => ({ sport, metric, direction })),
    ),
  );
  const movers = await Promise.all(
    combos.map(async ({ sport, metric, direction }) => {
      const board = await fetchJsonOrNull<TrendingLeaderboardResponse>(
        trendingLeaderboardUrl(sport, metric, undefined, 1, undefined, direction),
        "trending leaderboard",
      ).catch(() => null);
      const leader = board?.leaders?.[0];
      if (!leader || !leader.score) return null;
      return {
        sport,
        entity_type: leader.entity_type,
        id: leader.id,
        name: leader.name,
        image: leader.image,
        team_logo: leader.team_logo,
        metric,
        delta: leader.score,
      } satisfies HomeMover;
    }),
  );
  return movers.filter((mover): mover is HomeMover => mover !== null);
}

export const getHomeMovers = query(fetchHomeMoversImpl, "home-movers");

export const getVibesLeaderboard = query(fetchVibesLeaderboardImpl, "vibes-leaderboard");
export const getSigilLeaderboard = query(fetchSigilLeaderboardImpl, "sigil-leaderboard");
export const getTrendingLeaderboard = query(fetchTrendingLeaderboardImpl, "trending-leaderboard");
export const getNewsLeaderboard = query(fetchNewsLeaderboardImpl, "news-leaderboard");
export const getTransfersLeaderboard = query(fetchTransfersLeaderboardImpl, "transfers-leaderboard");
