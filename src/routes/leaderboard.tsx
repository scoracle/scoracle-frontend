/**
 * /leaderboard — the sport-wide stack-rank page.
 *
 * Standalone (NOT a profile sub-tab): sport-scoped, no entity context, so it
 * renders with the pillar primitives directly (<Board> + <NavWell>) rather than
 * <Card> (which needs ProfileContext). Four discovery boards behind one rail
 * (Sigil convergence — NOT the "Big 3" headline scores; the Sigil synthesis is a
 * profile crown, not a leaderboard rank):
 *
 *   Rating    — the z-score rating board (getLeaderboard, composite scope), with
 *               a season filter (?season=, defaults to the latest rated season)
 *   News      — hottest Gemma narratives by per-narrative impact (getNewsLeaderboard);
 *               Transfers/Trades is its facet (mirrors the profile News card):
 *               hottest Gemma-vetted rumors by heat (getTransfersLeaderboard),
 *               still deep-linkable as ?board=transfers but off the visible rail
 *   Vibe      — the Vibe end product's leaderboard surface: latest sentiment
 *               1-100 + the felt-read blurb (getVibesLeaderboard → vibe_scores);
 *               the profile surfaces vibe as a News-card facet
 *   Momentum  — biggest database-backed risers by Vibe or Rating trajectory
 *   Sigil     — latest holistic synthesis scores (getSigilLeaderboard)
 *
 * (Fantasy stays URL-reachable via ?board=fantasy but is off the visible rail.)
 *
 * All state lives on the URL (?sport, ?board, ?type, ?season) so a board is shareable and
 * survives reload — read reactively via the router's useSearchParams so a single
 * dispatch createAsync re-fetches only the active board on any change. Sport comes
 * from the home selector (?sport=), falling back to the $currentSport store.
 */

import { createEffect, createMemo, createSignal, Show, For, onMount, ErrorBoundary } from "solid-js";
import { isServer } from "solid-js/web";
import { createAsync, useSearchParams, type RoutePreloadFuncArgs } from "@solidjs/router";
import { MetaProvider, Title, Meta } from "@solidjs/meta";

import { SPORTS } from "../lib/types";
import { currentSport, setSport } from "../stores/sport";
import {
  getLeaderboard,
  getVibesLeaderboard,
  getSigilLeaderboard,
  getTrendingLeaderboard,
  getNewsLeaderboard,
  getTransfersLeaderboard,
  type VibeLeader,
  type SigilLeader,
  type TrendingLeader,
  type NewsLeader,
  type TransferLeader,
  type LeaderboardEntry,
} from "../lib/data/leaderboard.server";
import { getDirectory, getSportMetaMaps } from "../lib/data/entity-directory";
import type { AutocompleteEntity, TeamMeta } from "../lib/types";
import type { NewsScope } from "../contexts/profile";
import { tierColor, tierColorScore } from "../lib/utils/tier-color";
import { transferStageLabel, transferStageColor } from "../lib/utils/transfer-stage";
import { paramValue } from "../lib/utils/search-params";
import { profilePath } from "../lib/utils/profile-url";
import { transferNoun, fantasySupported, type CardId } from "../lib/cards/card-meta";
import { NEWS_SCOPE_OPTIONS, newsTrajectoryLabel, sourceAttribution } from "../lib/utils/news-display";
import { getWeeks } from "../lib/data/weeks.server";
import { parseWeekKey, weekOptionsFrom, weekKey } from "../lib/utils/week";
import NavWell from "../components/solid/NavWell";
import Select from "../components/solid/Select";
import Board, { BoardEmpty, BoardError, BoardLoading } from "../components/solid/Board";
import GutterAds from "../components/solid/GutterAds";
import GemmaSummary from "../components/solid/GemmaSummary";
import "./leaderboard.css";

type BoardId = "rating" | "fantasy" | "vibes" | "momentum" | "sigil" | "news" | "transfers";

// Discovery boards — one rail item per pillar, matching the profile NavWell's
// treatment. Fantasy and Transfers stay URL-reachable (?board=fantasy /
// ?board=transfers) but are off the visible rail: transfers is the
// Narratives board's facet (the conditions select below the rail), fantasy
// is a power-user link.
// Boards speak the characters' lenses (Scott, 2026-07-23): a board ranks
// entities through a character's lens, so the labels match the profile's
// card names — one vocabulary across surfaces. Board ids and ?board=
// values are unchanged (naming lock, not a code rename); the score keeps
// its own name (the meta card still says RATING).
const BOARD_ITEMS: ReadonlyArray<{ id: BoardId; label: string }> = [
  { id: "rating", label: "Scouting" },
  { id: "news", label: "Narratives" },
  { id: "vibes", label: "Vibe" },
  { id: "momentum", label: "Momentum" },
  { id: "sigil", label: "Sigil" },
];

// Sport rail — the NavWell's tab row (board switching moved to the AppTray, so
// the tabs carry the sport instead; the scoped controls compose the
// conditions line below).
const SPORT_ITEMS: ReadonlyArray<{ id: string; label: string }> = SPORTS.map((s) => ({
  id: s.idLower,
  label: s.display,
}));

const TYPE_OPTIONS = [
  { value: "player" as const, label: "Players" },
  { value: "team" as const, label: "Teams" },
];

// Momentum board scope — which trajectory's risers to rank.
const METRIC_OPTIONS = [
  { value: "vibe" as const, label: "Vibe risers" },
  { value: "rating" as const, label: "Rating risers" },
];

const VALID_NEWS_SCOPES = NEWS_SCOPE_OPTIONS.map((o) => o.value);

const SPORT_DISPLAY: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.idLower, s.display]),
);

const BOARD_BLURB: Record<BoardId, string> = {
  rating: "Ranked research database",
  fantasy: "Most fantasy points (PPR / DraftKings)",
  vibes: "Highest sentiment, last 48h",
  momentum: "Biggest risers — vibe or rating",
  sigil: "Holistic synthesis scores",
  news: "Leading narratives by impact",
  transfers: "Rumors by heat index",
};

const LIMIT = 50;

/** Eager warm (Scott, 2026-08-21): a hovered or in-flight link to
 *  /leaderboard starts the filter dropdowns' reads (directory + meta maps)
 *  and — when the link names the default Rating view, which is what the tray
 *  rows point at — the board itself. Args mirror the page's default-condition
 *  dispatch exactly; anything else re-reads through query() with its own key.
 *  Skipped at intent "initial" (hydration already holds the SSR payload). */
export function preload({ location, intent }: RoutePreloadFuncArgs) {
  if (isServer || intent === "initial") return;
  const q = new URLSearchParams(location.search);
  const sport = (q.get("sport") ?? currentSport() ?? "nba").toLowerCase();
  if (!SPORTS.some((s) => s.idLower === sport)) return;
  getDirectory(sport).catch(() => {});
  getSportMetaMaps(sport).catch(() => {});
  const type = q.get("type") === "team" ? "team" : "player";
  const board = q.get("board");
  const defaultBoard =
    !board || ["rating", "composite", "scouting", "fantasy"].includes(board);
  if (!defaultBoard) return;
  getLeaderboard(
    sport,
    type,
    "composite",
    null,
    LIMIT,
    { leagueId: null, teamId: null, positionGroup: null, conference: null, division: null },
  ).catch(() => {});
}

function profileHref(sport: string, type: string, id: number, name: string, tab?: string): string {
  return profilePath(sport, type, id, { name, tab });
}

function stripTrailingAttribution(text: string | null | undefined, sourceNames?: readonly string[] | null): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  let next = trimmed.replace(/\s*[-–—]\s*sources?\s*\([^)]*\)\.?$/i, "").trim();
  const names = (sourceNames ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean);
  if (names.length > 0) {
    next = next.replace(/\s*\(([^)]*)\)\.?$/, (match, inner: string) => {
      const lower = inner.toLowerCase();
      return names.some((name) => lower.includes(name)) ? "" : match;
    }).trim();
  }
  return next;
}

function trendMagnitudeColor(score: number): string {
  const magnitude = Math.abs(score);
  if (magnitude >= 25) return tierColor(90);
  if (magnitude >= 15) return tierColor(70);
  if (magnitude >= 8) return tierColor(50);
  if (magnitude >= 4) return tierColor(30);
  return tierColor(10);
}

/** One row, normalized across every board so the list has a single render path. */
interface DisplayRow {
  rank: number | null;
  href: string;
  avatar: string | null;
  /** True for player headshots (cropped square), false for crests and logos
   *  (fitted whole). Media prints FLAT on the sheet either way — no frame,
   *  no fill, no seat (Scott, 2026-08-10). */
  photo: boolean;
  crest: string | null; // small overlaid team badge (players only)
  name: string;
  sub: string | null;
  /** Colored trailing chip on the sub-line (transfers: the tier-colored verdict stage). */
  subAccent?: { text: string; color: string } | null;
  metric: string;
  metricColor: string | null; // tierColor for 0-100 scales; null = neutral count
  /** Expandable detail (transfers: Gemma's grounded blurb). Absent → no toggle. */
  blurb?: string | null;
  blurbSource?: string | null;
  /** Clamp the detail to a whisper (sigil board: the Oracle reading is 2-4
   *  sentences — the board shows one line, the profile card speaks it whole). */
  blurbClamp?: boolean;
}

export default function Leaderboard() {
  const [searchParams, setParams] = useSearchParams();
  // Router params are `string | string[] | undefined`; every read wants the
  // single-string view.
  const params = (key: string) => paramValue(searchParams[key]);
  const sport = () => (params("sport") ?? currentSport() ?? "nba").toLowerCase();
  const board = (): BoardId => {
    const b = params("board");
    if (b === "fantasy") return fantasySupported(sport()) ? "fantasy" : "rating";
    if (b === "composite" || b === "rating" || b === "scouting") return "rating";
    if (b === "trending" || b === "momentum") return "momentum";
    if (b === "narratives") return "news";
    return b === "vibes" || b === "news" || b === "transfers" || b === "sigil" ? b : "rating";
  };
  const entityType = (): "player" | "team" => (params("type") === "team" ? "team" : "player");
  // Momentum metric scope — vibe risers (default) or rating risers.
  const metric = (): "vibe" | "rating" => (params("metric") === "rating" ? "rating" : "vibe");
  const newsScope = (): NewsScope =>
    (VALID_NEWS_SCOPES as readonly string[]).includes(params("newsScope") ?? "")
      ? (params("newsScope") as NewsScope)
      : "current_week";
  // transfers are always pairs; fantasy is players-only.
  const showTypeToggle = () => board() !== "transfers" && board() !== "fantasy";
  // The vibe/rating scope toggle is the Momentum board's distinguishing control.
  const showMetricToggle = () => board() === "momentum";
  const showNewsScopeToggle = () => board() === "news" || board() === "transfers";
  // Season filter — Rating board only. Null ⇒ the backend's latest rated season.
  const seasonParam = (): number | null => {
    const n = Number(params("season"));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const intParam = (value: string | undefined): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const leagueId = () => intParam(params("leagueId"));
  const teamId = () => intParam(params("teamId"));
  const conference = () => params("conference")?.trim() || null;
  const division = () => params("division")?.trim() || null;
  const positionGroup = () => (entityType() === "player" ? params("positionGroup")?.trim() || null : null);
  const cohortArgs = () => ({
    leagueId: leagueId(),
    teamId: teamId(),
    positionGroup: positionGroup(),
    conference: conference(),
    division: division(),
  });
  // The board's time axis (mig 237): ?week=SEASON-N serves that reporting
  // week's archive on the content boards; absent = the live view. Same key
  // shape as the profile rail, so a shared link crosses surfaces cleanly.
  const weekRef = () => parseWeekKey(params("week"));
  const boardWeek = () => {
    const r = weekRef();
    return r ? { year: r.year, week: r.week } : null;
  };
  const showWeekSelect = () =>
    board() === "news" || board() === "transfers" || board() === "vibes" || board() === "sigil";
  const sportWeeks = createAsync(async () => getWeeks(sport()));
  const weekSelectOptions = () => weekOptionsFrom(sportWeeks()?.weeks);
  // Per-x ranking on the rating board (players): rank by a rating_modes block.
  const RATE_VALUES = new Set(["per_36", "per_90", "per_game", "per_season"]);
  const rate = () => {
    const r = params("rate") ?? "";
    return board() === "rating" && entityType() === "player" && RATE_VALUES.has(r) ? r : null;
  };
  const RATE_OPTIONS: Record<string, { value: string; label: string }[]> = {
    nba: [
      { value: "per_season", label: "Per Season" },
      { value: "default", label: "Per Game" },
      { value: "per_36", label: "Per 36" },
    ],
    football: [
      { value: "default", label: "Per Season" },
      { value: "per_game", label: "Per Game" },
      { value: "per_90", label: "Per 90" },
    ],
    nfl: [
      { value: "default", label: "Per Season" },
      { value: "per_game", label: "Per Game" },
    ],
  };
  const rateOptions = () => RATE_OPTIONS[sport()] ?? [];

  // Keep the rest of the site's sport in sync when arriving with an explicit
  // ?sport= (e.g. from the home dropdown), so a later nav to a profile matches.
  onMount(() => {
    if (params("sport")) setSport(sport());
  });

  const [scopeEntities, setScopeEntities] = createSignal<AutocompleteEntity[]>([]);
  const [scopeTeamMeta, setScopeTeamMeta] = createSignal<Record<string, TeamMeta>>({});
  const [retryTick, setRetryTick] = createSignal(0);

  // Client-only loads (effects don't run during SSR) — the cohort filter
  // dropdowns are an interactive enhancement over the SSR'd board.
  createEffect(() => {
    const s = sport();
    getDirectory(s).then((items) => {
      if (sport() === s) setScopeEntities(items);
    }).catch(() => setScopeEntities([]));
    getSportMetaMaps(s).then((maps) => {
      if (sport() === s) setScopeTeamMeta(maps.teams);
    }).catch(() => setScopeTeamMeta({}));
  });

  const teamEntities = () =>
    scopeEntities()
      .filter((e) => e.type === "team")
      .sort((a, b) => a.name.localeCompare(b.name));
  const playerEntities = () => scopeEntities().filter((e) => e.type === "player");
  const teamMeta = (team: AutocompleteEntity): TeamMeta | undefined => scopeTeamMeta()[team.id];
  const teamMatchesScope = (
    team: AutocompleteEntity,
    scope: { leagueId?: number | null; conference?: string | null; division?: string | null },
  ) => {
    const meta = teamMeta(team);
    if (scope.leagueId && meta?.league?.id !== scope.leagueId) return false;
    if (scope.conference && meta?.conference !== scope.conference) return false;
    if (scope.division && meta?.division !== scope.division) return false;
    return true;
  };
  const scopedTeamEntities = (scope: { leagueId?: number | null; conference?: string | null; division?: string | null }) =>
    teamEntities().filter((team) => teamMatchesScope(team, scope));
  const leagueOptions = () => {
    const seen = new Map<number, string>();
    for (const team of teamEntities()) {
      const league = teamMeta(team)?.league;
      if (league?.id && !seen.has(league.id)) seen.set(league.id, league.name);
    }
    return [
      { value: "all", label: "All leagues" },
      ...[...seen.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, label]) => ({ value: String(id), label })),
    ];
  };
  const conferenceOptions = () => {
    const values = new Set<string>();
    for (const team of scopedTeamEntities({ leagueId: leagueId() })) {
      const meta = teamMeta(team);
      if (meta?.conference) values.add(meta.conference);
    }
    return [{ value: "all", label: "All conferences" }, ...[...values].sort().map((v) => ({ value: v, label: v }))];
  };
  const divisionOptions = () => {
    const values = new Set<string>();
    for (const team of scopedTeamEntities({ leagueId: leagueId(), conference: conference() })) {
      const meta = teamMeta(team);
      if (meta?.division) values.add(meta.division);
    }
    return [{ value: "all", label: "All divisions" }, ...[...values].sort().map((v) => ({ value: v, label: v }))];
  };
  const teamOptions = () => [
    { value: "all", label: "All teams" },
    ...scopedTeamEntities({ leagueId: leagueId(), conference: conference(), division: division() })
      .map((team) => ({ value: team.id, label: team.name })),
  ];
  const positionGroupOptions = () => {
    const values = new Set<string>();
    for (const player of playerEntities()) if (player.positionGroup) values.add(player.positionGroup);
    return [{ value: "all", label: "All positions" }, ...[...values].sort().map((v) => ({ value: v, label: v }))];
  };

  // ONE dispatch: re-runs on sport / board / entityType change, fetches only the
  // active board. Returns a discriminated payload the row-mapper normalizes.
  const data = createAsync(async () => {
    retryTick();
    try {
      const s = sport();
      const et = entityType();
      const b = board();
      const c = cohortArgs();
      if (b === "vibes") {
        const r = await getVibesLeaderboard(s, et, LIMIT, c, boardWeek());
        return { kind: "vibes" as const, rows: r?.leaders ?? [] };
      }
      if (b === "momentum") {
        const r = await getTrendingLeaderboard(s, metric(), et, LIMIT, c);
        return { kind: "momentum" as const, rows: r?.leaders ?? [], metric: metric() };
      }
      if (b === "news") {
        const r = await getNewsLeaderboard(s, et, LIMIT, newsScope(), c, boardWeek());
        return { kind: "news" as const, rows: r?.leaders ?? [] };
      }
      if (b === "sigil") {
        const r = await getSigilLeaderboard(s, et, LIMIT, seasonParam(), c, boardWeek());
        return { kind: "sigil" as const, rows: r?.leaders ?? [], season: r?.season ?? null };
      }
      if (b === "transfers") {
        const r = await getTransfersLeaderboard(s, LIMIT, newsScope(), c.teamId, boardWeek());
        return { kind: "transfers" as const, rows: r?.rumors ?? [] };
      }
      if (b === "fantasy") {
        // Players-only; ranked by box-score fantasy points (scope="fantasy").
        const r = await getLeaderboard(s, "player", "fantasy", seasonParam(), LIMIT, c);
        return {
          kind: "fantasy" as const,
          rows: r?.leaders ?? [],
          seasons: r?.available_seasons ?? [],
          season: r?.season ?? null,
        };
      }
      const r = await getLeaderboard(s, et, "composite", seasonParam(), LIMIT, c, rate());
      return {
        kind: "rating" as const,
        rows: r?.leaders ?? [],
        seasons: r?.available_seasons ?? [],
        season: r?.season ?? null,
      };
    } catch (err) {
      return { kind: "error" as const, error: err };
    }
  });
  const dataError = () => {
    const d = data();
    return d?.kind === "error" ? d.error : null;
  };
  const retryLeaderboard = () => setRetryTick((tick) => tick + 1);

  const fmtSub = (parts: Array<string | null | undefined>) =>
    parts.filter(Boolean).join(" · ") || null;
  const trajectoryLabel = (trajectory?: string | null, label?: string | null) =>
    newsTrajectoryLabel(trajectory, label);

  const rows = createMemo<DisplayRow[]>(() => {
    const d = data();
    if (!d || d.kind === "error") return [];
    const s = sport();
    if (d.kind === "transfers") {
      return (d.rows as TransferLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, "player", r.player_id, r.player_name, "news"),
        avatar: r.player_image,
        photo: true,
        crest: r.team_logo,
        name: r.player_name,
        sub: fmtSub([r.team_name, r.direction, trajectoryLabel(r.trajectory, r.trajectory_label)]),
        subAccent: r.stage ? { text: transferStageLabel(r.stage), color: transferStageColor(r.stage) } : null,
        metric: String(r.heat),
        metricColor: tierColor(r.heat),
        blurb: stripTrailingAttribution(r.headline, r.source_names),
        blurbSource: sourceAttribution(r.source_count, r.source_names),
      }));
    }
    if (d.kind === "rating") {
      return (d.rows as LeaderboardEntry[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "rating"),
        avatar: r.image,
        photo: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.entity_type === "player" ? r.team_code : null, r.position]),
        // Magnitude is players-only; teams keep the percentile rank.
        metric: r.rating_score == null || r.rating_rank == null
          ? "—"
          : r.entity_type === "team"
            ? String(r.rating_rank)
            : r.rating_score.toFixed(1),
        metricColor: r.rating_score == null || r.rating_rank == null
          ? null
          : r.entity_type === "team"
            ? tierColor(r.rating_rank)
            : tierColorScore(r.rating_score),
      }));
    }
    if (d.kind === "fantasy") {
      // Metric is the fantasy-points total; the chip color reads its percentile.
      return (d.rows as LeaderboardEntry[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, "player", r.id, r.name, "stats"),
        avatar: r.image,
        photo: true,
        crest: r.team_logo,
        name: r.name,
        sub: fmtSub([r.team_code, r.position]),
        metric: r.fantasy_points == null ? "—" : r.fantasy_points.toFixed(1),
        metricColor: r.fantasy_rank == null ? null : tierColor(r.fantasy_rank),
      }));
    }
    if (d.kind === "news") {
      // news board (NewsLeader): the hottest narrative, ranked by impact; the
      // headline is the sub-line, the write-up the expandable blurb.
      return (d.rows as NewsLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "news"),
        avatar: r.image,
        photo: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: r.headline,
        subAccent: trajectoryLabel(r.trajectory, r.trajectory_label)
          ? { text: trajectoryLabel(r.trajectory, r.trajectory_label)!, color: "var(--text-secondary)" }
          : null,
        metric: String(r.heat),
        metricColor: tierColor(r.heat),
        blurbSource: sourceAttribution(r.source_count, r.source_names),
      }));
    }
    if (d.kind === "momentum") {
      // Momentum board (legacy payload name: trending): the risers — the recent rise (+N) as the metric,
      // color-tiered by rise magnitude; scoped to vibe or rating via the metric toggle.
      return (d.rows as TrendingLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "momentum"),
        avatar: r.image,
        photo: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.team_code]),
        metric: r.heat >= 0 ? `+${r.heat}` : String(r.heat),
        metricColor: trendMagnitudeColor(r.heat),
      }));
    }
    if (d.kind === "sigil") {
      return (d.rows as SigilLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "sigil"),
        avatar: r.image,
        photo: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.team_code]),
        metric: String(r.heat),
        metricColor: tierColor(r.heat),
        // The Oracle's hook (the card contract) — clamped to a line here;
        // the profile Sigil card speaks the reading in full.
        blurb: r.headline,
        blurbClamp: true,
      }));
    }
    // vibe board (VibeLeader): the Vibe end product — latest sentiment as the metric,
    // the felt-read prompt as the expandable blurb (its only public surface).
    return (d.rows as VibeLeader[]).map((r) => ({
      rank: r.rank,
      href: profileHref(s, r.entity_type, r.id, r.name, "sigil"),
      avatar: r.image,
      photo: r.entity_type === "player",
      crest: r.entity_type === "player" ? r.team_logo : null,
      name: r.name,
      sub: fmtSub([r.team_code]),
      metric: String(r.heat),
      metricColor: tierColor(r.heat),
      blurb: r.headline,
    }));
  });

  const sportName = () => SPORT_DISPLAY[sport()] ?? sport().toUpperCase();
  // Off-rail boards resolve their labels explicitly (transfers reads "Trades"
  // for nba/nfl, "Transfers" for football). Drives the page/share title and
  // the section aria-labels.
  const boardLabel = () => {
    if (board() === "transfers") return transferNoun(sport());
    if (board() === "fantasy") return "Fantasy";
    return BOARD_ITEMS.find((b) => b.id === board())?.label ?? "Scouting";
  };

  // Rating board's season dropdown: options come from the response's
  // available_seasons; the selected value is the requested season or the latest.
  const ratingSeasons = (): number[] => {
    const d = data();
    return d && d.kind !== "error" && (d.kind === "rating" || d.kind === "fantasy") ? d.seasons : [];
  };
  const seasonOptions = () => ratingSeasons().map((s) => ({ value: String(s), label: String(s) }));
  const selectedSeason = (): number | null => {
    const d = data();
    return seasonParam() ?? (d && d.kind !== "error" && (d.kind === "rating" || d.kind === "fantasy" || d.kind === "sigil") ? d.season : null);
  };

  // Every board ranks entities THROUGH a character's lens, so the sheet takes
  // that character's deck hue — the same six hues the profile cards wear, and
  // the reason switching boards changes the sheet's colour. Fantasy has no
  // character behind it (it is a rating scope, not a lens), so it prints on
  // plain stock.
  const BOARD_DECK: Record<BoardId, CardId | undefined> = {
    rating: "scouting",
    news: "narratives",
    transfers: "transfers",
    vibes: "vibe",
    momentum: "momentum",
    sigil: "sigil",
    fantasy: undefined,
  };

  // The metric column's head. Named ONCE per board (Board doctrine) — a caps
  // label repeated down fifty rows was the loudest noise on the old plate.
  const metricLabel = (): string => {
    switch (board()) {
      case "fantasy": return "Fantasy";
      case "news": return "Impact";
      case "transfers": return "Heat";
      case "vibes": return "Vibe";
      case "sigil": return "Sigil";
      case "momentum": return metric() === "rating" ? "Rating rise" : "Vibe rise";
      default: return "Rating";
    }
  };

  // The masthead's second line — the board's scope in one editorial phrase.
  // Deliberately the INVARIANTS only (sport · type · window): the cohort
  // dropdowns state themselves in the conditions line directly above, and
  // echoing them here would just double the page's own chrome.
  const NEWS_SCOPE_PHRASE: Record<string, string> = {
    current_week: "this week",
    last_week: "last week",
    two_weeks_ago: "two weeks ago",
    three_weeks_ago: "three weeks ago",
    last_month: "last month",
  };
  const scopeLine = (): string => {
    const parts: (string | null)[] = [sportName()];
    parts.push(board() === "transfers" || board() === "fantasy"
      ? "players"
      : entityType() === "team" ? "teams" : "players");
    const b = board();
    if (b === "rating" || b === "fantasy" || b === "sigil") {
      const season = selectedSeason();
      if (season) parts.push(`${season} season`);
    }
    if (b === "news" || b === "transfers") parts.push(NEWS_SCOPE_PHRASE[newsScope()] ?? null);
    if (b === "momentum") parts.push(metric() === "rating" ? "rating trajectory" : "vibe trajectory");
    return parts.filter(Boolean).join(" · ");
  };

  const canonicalUrl = () => {
    const p = new URLSearchParams({ sport: sport().toUpperCase() });
    if (board() !== "rating") p.set("board", board());
    if (entityType() === "team") p.set("type", "team");
    return `https://scoracle.com/leaderboard?${p.toString()}`;
  };
  const pageTitle = () => `${sportName()} ${boardLabel()} Leaderboard`;

  return (
    <>
      <MetaProvider>
        <Title>{`${pageTitle()} · Scoracle`}</Title>
        <Meta property="og:title" content={`${pageTitle()} · Scoracle`} />
        <Meta property="og:description" content={BOARD_BLURB[board()]} />
        <Meta property="og:url" content={canonicalUrl()} />
      </MetaProvider>

      <main class="lb-main">
        <ErrorBoundary
          fallback={(err, reset) => (
            <Board
              title={boardLabel()}
              titleAsHeading
              deck={BOARD_DECK[board()]}
              scope={sportName()}
              ariaLabel={`${sportName()} ${boardLabel()} leaderboard`}
            >
              <BoardError detail={err instanceof Error ? err.message : String(err)} onRetry={reset} />
            </Board>
          )}
        >
          {/* Sport tabs on top; the conditions line below, both in the tray
              well. The product (board) is named in the headline and switched
              from the AppTray — so the tabs carry the sport, not the board. */}
          <NavWell
            items={SPORT_ITEMS}
            active={sport()}
            onSelect={(id) => setParams({ sport: id.toUpperCase(), leagueId: null, conference: null, division: null, teamId: null, positionGroup: null })}
            ariaLabel="Select sport"
            conditionsAriaLabel="Leaderboard view controls"
            conditions={
              <>
              <Show when={showTypeToggle()}>
                <Select
                  options={TYPE_OPTIONS}
                  value={entityType()}
                  onChange={(id) => setParams({ type: id === "player" ? null : id, positionGroup: null })}
                  ariaLabel="Players or teams"
                />
              </Show>
              <Show when={leagueOptions().length > 1}>
                <Select
                  options={leagueOptions()}
                  value={params("leagueId") ?? "all"}
                  onChange={(id) => setParams({ leagueId: id === "all" ? null : id, conference: null, division: null, teamId: null })}
                  ariaLabel="League"
                />
              </Show>
              <Show when={conferenceOptions().length > 1}>
                <Select
                  options={conferenceOptions()}
                  value={conference() ?? "all"}
                  onChange={(id) => setParams({ conference: id === "all" ? null : id, division: null, teamId: null })}
                  ariaLabel="Conference"
                />
              </Show>
              <Show when={divisionOptions().length > 1}>
                <Select
                  options={divisionOptions()}
                  value={division() ?? "all"}
                  onChange={(id) => setParams({ division: id === "all" ? null : id, teamId: null })}
                  ariaLabel="Division"
                />
              </Show>
              <Show when={teamOptions().length > 1}>
                <Select
                  options={teamOptions()}
                  value={params("teamId") ?? "all"}
                  onChange={(id) => setParams({ teamId: id === "all" ? null : id })}
                  ariaLabel="Team"
                />
              </Show>
              <Show when={entityType() === "player" && positionGroupOptions().length > 1}>
                <Select
                  options={positionGroupOptions()}
                  value={positionGroup() ?? "all"}
                  onChange={(id) => setParams({ positionGroup: id === "all" ? null : id })}
                  ariaLabel="Position group"
                />
              </Show>
              <Show when={showMetricToggle()}>
                <Select
                  options={METRIC_OPTIONS}
                  value={metric()}
                  onChange={(id) => setParams({ metric: id === "vibe" ? null : id })}
                  ariaLabel="Momentum metric"
                />
              </Show>
              {/* News hub facet — Narratives | Trades/Transfers. Mirrors the
                  profile News card's facet select; the facet IS the board
                  under the hood, so ?board=transfers deep links stay alive. */}
              <Show when={showNewsScopeToggle()}>
                <Select
                  options={[
                    { value: "news", label: "Narratives" },
                    { value: "transfers", label: transferNoun(sport()) },
                  ]}
                  value={board()}
                  onChange={(id) => setParams({ board: id })}
                  ariaLabel="News view"
                />
              </Show>
              <Show when={showNewsScopeToggle() && !weekRef()}>
                <Select
                  options={NEWS_SCOPE_OPTIONS}
                  value={newsScope()}
                  onChange={(id) => setParams({ newsScope: id === "current_week" ? null : id })}
                  ariaLabel="News scope"
                />
              </Show>
              {/* The board's week axis (mig 237): Today = live view; a week =
                  that reporting week's archive. Choosing a week retires the
                  rolling news scope — the calendar wins. */}
              <Show when={showWeekSelect() && weekSelectOptions().length > 1}>
                <Select
                  options={weekSelectOptions()}
                  value={weekRef() ? weekKey(weekRef()!) : ""}
                  onChange={(w) => setParams({ week: w || null, newsScope: null })}
                  ariaLabel="Week"
                />
              </Show>
              {/* Per-x ranking (the scope collapse, 2026-09-05): rank the
                  rating board by a per-x block — the rate ladder the Profile
                  chart speaks, applied to the whole cohort. */}
              <Show when={board() === "rating" && entityType() === "player" && rateOptions().length > 1}>
                <Select
                  options={rateOptions()}
                  value={rate() ?? "default"}
                  onChange={(v) => setParams({ rate: v === "default" ? null : v })}
                  ariaLabel="Rate"
                />
              </Show>
              <Show when={(board() === "rating" || board() === "fantasy") && ratingSeasons().length > 1}>
                <Select
                  options={seasonOptions()}
                  value={String(selectedSeason() ?? "")}
                  onChange={(v) => {
                    const yr = Number(v);
                    // Drop the param at the latest season for a clean, shareable URL.
                    setParams({ season: yr === ratingSeasons()[0] ? null : String(yr) });
                  }}
                  ariaLabel="Season"
                />
              </Show>
            </>
            }
          />

        {/* The Board — the page's artifact (the Board reveals hierarchy; the
            Cards tell the story). Named once, in the masthead. */}
        <Board
          title={boardLabel()}
          titleAsHeading
          deck={BOARD_DECK[board()]}
          scope={scopeLine()}
          metricLabel={rows().length > 0 ? metricLabel() : null}
          count={rows().length > 0 ? `${rows().length} ranked` : null}
          ariaLabel={`${sportName()} ${boardLabel()} leaderboard`}
        >
          <Show when={data()} fallback={<BoardLoading label={`${sportName()} ${boardLabel()} leaderboard loading`} />}>
            <Show
              when={dataError()}
              keyed
              fallback={
                <Show
                  when={rows().length > 0}
                  fallback={<BoardEmpty ariaLabel="No leaderboard entries" />}
                >
                  <ol class="board-register">
                    <For each={rows()}>
                      {(r) => (
                        <li class="board-row">
                          {/* The spine — Board.css owns its type and its four
                              ink bands; the row only supplies the numeral. */}
                          <span class="board-rank">{r.rank != null ? String(r.rank).padStart(2, "0") : "—"}</span>
                          <span class="lb-media">
                            <Show
                              when={r.avatar}
                              fallback={<span class="lb-media-mono">{r.name.charAt(0)}</span>}
                            >
                              {(src) => (
                                <img
                                  class="lb-media-img"
                                  classList={{ "lb-media-photo": r.photo }}
                                  src={src()}
                                  alt=""
                                  loading="lazy"
                                />
                              )}
                            </Show>
                            <Show when={r.crest}>
                              {(c) => <img class="lb-crest" src={c()} alt="" loading="lazy" />}
                            </Show>
                          </span>
                          <a class="lb-name-cell" href={r.href}>
                            <span class="lb-name">{r.name}</span>
                            <Show when={r.sub || r.subAccent}>
                              <span class="lb-sub">
                                {r.sub}
                                {/* The numeral is the row's only colour (Board
                                    ruling) — the stage/trajectory accent reads
                                    in ink weight, not hue. */}
                                <Show when={r.subAccent}>
                                  {(a) => (
                                    <>
                                      {r.sub ? " · " : ""}
                                      <span class="lb-sub-accent">{a().text}</span>
                                    </>
                                  )}
                                </Show>
                              </span>
                            </Show>
                          </a>
                          {/* The metric is named once, at the head of its
                              column (Board doctrine) — never per row. */}
                          <span class="lb-metric" style={r.metricColor ? { color: r.metricColor } : undefined}>
                            {r.metric}
                          </span>
                          <Show when={r.blurb}>
                            {(b) => (
                              <GemmaSummary
                                text={b()}
                                source={r.blurbSource}
                                class={`lb-row-blurb${r.blurbClamp ? " lb-row-blurb--clamp" : ""}`}
                              />
                            )}
                          </Show>
                        </li>
                      )}
                    </For>
                  </ol>
                </Show>
              }
            >
              {(err) => (
                <BoardError
                  detail={err instanceof Error ? err.message : String(err)}
                  onRetry={retryLeaderboard}
                />
              )}
            </Show>
          </Show>
        </Board>
      </ErrorBoundary>

      <GutterAds />
      </main>
    </>
  );
}

// The Veil error/empty faces and the deck-back loader are retired: card
// idioms don't belong on the Board (a card back promises a flip — the wrong
// metaphor for a rank list). The three non-card faces live in Board.tsx.
