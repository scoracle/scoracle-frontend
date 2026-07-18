/**
 * /leaderboard — the sport-wide stack-rank page.
 *
 * Standalone (NOT a profile sub-tab): sport-scoped, no entity context, so it
 * renders with the pillar primitives directly (<Shell> + <NavWell>) rather than
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
import { createAsync, useSearchParams } from "@solidjs/router";
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
import { transferNoun, fantasySupported } from "../lib/cards/card-meta";
import { VEIL_ARCHETYPE } from "../lib/vibe/archetypes";
import NavWell from "../components/solid/NavWell";
import Select from "../components/solid/Select";
import Shell from "../components/solid/Shell";
import GutterAds from "../components/solid/GutterAds";
import GemmaSummary from "../components/solid/GemmaSummary";
import "../components/solid/content-cards.css";
import "./leaderboard.css";

type BoardId = "rating" | "fantasy" | "vibes" | "momentum" | "sigil" | "news" | "transfers";

// Discovery boards — one rail item per pillar, matching the profile NavWell's
// treatment. Fantasy and Transfers stay URL-reachable (?board=fantasy /
// ?board=transfers) but are off the visible rail: transfers is the News
// board's facet (the conditions select below the rail), fantasy is a
// power-user link.
const BOARD_ITEMS: ReadonlyArray<{ id: BoardId; label: string }> = [
  { id: "rating", label: "Rating" },
  { id: "news", label: "News" },
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

const NEWS_SCOPE_OPTIONS = [
  { value: "current_week", label: "Current" },
  { value: "last_week", label: "Last week" },
  { value: "two_weeks_ago", label: "2 weeks" },
  { value: "three_weeks_ago", label: "3 weeks" },
  { value: "last_month", label: "Month" },
];

const VALID_NEWS_SCOPES = NEWS_SCOPE_OPTIONS.map((o) => o.value);

const TRAJECTORY_LABELS: Record<string, string> = {
  developing_story: "Developing story",
  heating_up: "Heating up",
  cooling_off: "Cooling off",
};

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

function profileHref(sport: string, type: string, id: number, name: string, tab?: string): string {
  return profilePath(sport, type, id, { name, tab });
}

function sourceAttribution(sourceCount?: number | null, sourceNames?: readonly string[] | null): string | null {
  const count = sourceCount ?? 0;
  const names = sourceNames ?? [];
  if (count <= 0 && names.length === 0) return null;
  const countLabel = count > 0 ? `${count} ${count === 1 ? "source" : "sources"}` : null;
  const shownNames = names.slice(0, 2).join(", ");
  return [countLabel, shownNames].filter(Boolean).join(" · ");
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
  round: boolean; // player photos read as portraits; crests/logos square
  crest: string | null; // small overlaid team badge (players only)
  name: string;
  sub: string | null;
  /** Colored trailing chip on the sub-line (transfers: the tier-colored verdict stage). */
  subAccent?: { text: string; color: string } | null;
  metric: string;
  metricColor: string | null; // tierColor for 0-100 scales; null = neutral count
  metricLabel: string;
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
    if (b === "composite" || b === "rating") return "rating";
    if (b === "trending" || b === "momentum") return "momentum";
    return b === "vibes" || b === "news" || b === "transfers" || b === "sigil" ? b : "rating";
  };
  const entityType = (): "player" | "team" => (params("type") === "team" ? "team" : "player");
  // Momentum metric scope — vibe risers (default) or rating risers.
  const metric = (): "vibe" | "rating" => (params("metric") === "rating" ? "rating" : "vibe");
  const newsScope = (): NewsScope =>
    VALID_NEWS_SCOPES.includes(params("newsScope") ?? "")
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
        const r = await getVibesLeaderboard(s, et, LIMIT, c.leagueId, c.teamId, null, c.positionGroup, c.conference, c.division);
        return { kind: "vibes" as const, rows: r?.leaders ?? [] };
      }
      if (b === "momentum") {
        const r = await getTrendingLeaderboard(s, metric(), et, LIMIT, c.leagueId, c.teamId, null, c.positionGroup, c.conference, c.division);
        return { kind: "momentum" as const, rows: r?.leaders ?? [], metric: metric() };
      }
      if (b === "news") {
        const r = await getNewsLeaderboard(s, et, LIMIT, newsScope(), c.leagueId, c.teamId, null, c.positionGroup, c.conference, c.division);
        return { kind: "news" as const, rows: r?.leaders ?? [] };
      }
      if (b === "sigil") {
        const r = await getSigilLeaderboard(s, et, LIMIT, seasonParam(), c.leagueId, c.teamId, null, c.positionGroup, c.conference, c.division);
        return { kind: "sigil" as const, rows: r?.leaders ?? [], season: r?.season ?? null };
      }
      if (b === "transfers") {
        const r = await getTransfersLeaderboard(s, LIMIT, newsScope(), c.teamId);
        return { kind: "transfers" as const, rows: r?.rumors ?? [] };
      }
      if (b === "fantasy") {
        // Players-only; ranked by box-score fantasy points (scope="fantasy").
        const r = await getLeaderboard(s, "player", "fantasy", seasonParam(), LIMIT, null, c.leagueId, c.conference, c.division, c.teamId, c.positionGroup);
        return {
          kind: "fantasy" as const,
          rows: r?.leaders ?? [],
          seasons: r?.available_seasons ?? [],
          season: r?.season ?? null,
        };
      }
      const r = await getLeaderboard(s, et, "composite", seasonParam(), LIMIT, null, c.leagueId, c.conference, c.division, c.teamId, c.positionGroup);
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
    label ?? (trajectory ? TRAJECTORY_LABELS[trajectory] ?? null : null);

  const rows = createMemo<DisplayRow[]>(() => {
    const d = data();
    if (!d || d.kind === "error") return [];
    const s = sport();
    if (d.kind === "transfers") {
      return (d.rows as TransferLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, "player", r.player_id, r.player_name, "news"),
        avatar: r.player_image,
        round: true,
        crest: r.team_logo,
        name: r.player_name,
        sub: fmtSub([r.team_name, r.direction, trajectoryLabel(r.trajectory, r.trajectory_label)]),
        subAccent: r.stage ? { text: transferStageLabel(r.stage), color: transferStageColor(r.stage) } : null,
        metric: String(r.heat),
        metricColor: tierColor(r.heat),
        metricLabel: "Heat",
        blurb: stripTrailingAttribution(r.summary ?? r.gemma_summary, r.source_names),
        blurbSource: sourceAttribution(r.source_count, r.source_names),
      }));
    }
    if (d.kind === "rating") {
      return (d.rows as LeaderboardEntry[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "rating"),
        avatar: r.image,
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.entity_type === "player" ? r.team_code : null, r.position]),
        // Magnitude is players-only; teams keep the percentile rank.
        metric: r.rating_composite_score == null || r.rating_composite_rank == null
          ? "—"
          : r.entity_type === "team"
            ? String(r.rating_composite_rank)
            : r.rating_composite_score.toFixed(1),
        metricColor: r.rating_composite_score == null || r.rating_composite_rank == null
          ? null
          : r.entity_type === "team"
            ? tierColor(r.rating_composite_rank)
            : tierColorScore(r.rating_composite_score),
        metricLabel: "Rating",
      }));
    }
    if (d.kind === "fantasy") {
      // Metric is the fantasy-points total; the chip color reads its percentile.
      return (d.rows as LeaderboardEntry[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, "player", r.id, r.name, "stats"),
        avatar: r.image,
        round: true,
        crest: r.team_logo,
        name: r.name,
        sub: fmtSub([r.team_code, r.position]),
        metric: r.fantasy_points == null ? "—" : r.fantasy_points.toFixed(1),
        metricColor: r.fantasy_rank == null ? null : tierColor(r.fantasy_rank),
        metricLabel: "Fantasy",
      }));
    }
    if (d.kind === "news") {
      // news board (NewsLeader): the hottest narrative, ranked by impact; the
      // headline is the sub-line, the write-up the expandable blurb.
      return (d.rows as NewsLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "news"),
        avatar: r.image,
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: r.narrative_title,
        subAccent: trajectoryLabel(r.trajectory, r.trajectory_label)
          ? { text: trajectoryLabel(r.trajectory, r.trajectory_label)!, color: "var(--text-secondary)" }
          : null,
        metric: String(r.score),
        metricColor: tierColor(r.score),
        metricLabel: "Impact",
        blurb: stripTrailingAttribution(r.body, r.source_names),
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
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.team_code]),
        metric: `+${r.score}`,
        metricColor: trendMagnitudeColor(r.score),
        metricLabel: d.metric === "rating" ? "Rating rise" : "Vibe rise",
      }));
    }
    if (d.kind === "sigil") {
      return (d.rows as SigilLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id, r.name, "sigil"),
        avatar: r.image,
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.team_code]),
        metric: String(r.score),
        metricColor: tierColor(r.score),
        metricLabel: "Sigil",
        // The Oracle reading (Session C, Scott's pick) — clamped to a line here;
        // the profile Sigil card speaks it in full.
        blurb: r.reading,
        blurbClamp: true,
      }));
    }
    // vibe board (VibeLeader): the Vibe end product — latest sentiment as the metric,
    // the felt-read prompt as the expandable blurb (its only public surface).
    return (d.rows as VibeLeader[]).map((r) => ({
      rank: r.rank,
      href: profileHref(s, r.entity_type, r.id, r.name, "sigil"),
      avatar: r.image,
      round: r.entity_type === "player",
      crest: r.entity_type === "player" ? r.team_logo : null,
      name: r.name,
      sub: fmtSub([r.team_code]),
      metric: String(r.score),
      metricColor: tierColor(r.score),
      metricLabel: "Vibe",
      blurb: r.blurb,
    }));
  });

  const sportName = () => SPORT_DISPLAY[sport()] ?? sport().toUpperCase();
  // Off-rail boards resolve their labels explicitly (transfers reads "Trades"
  // for nba/nfl, "Transfers" for football). Drives the page/share title and
  // the section aria-labels.
  const boardLabel = () => {
    if (board() === "transfers") return transferNoun(sport());
    if (board() === "fantasy") return "Fantasy";
    return BOARD_ITEMS.find((b) => b.id === board())?.label ?? "Rating";
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
        <header class="lb-headline">
          <h1 class="lb-title">{`${boardLabel().toUpperCase()} LEADERBOARD`}</h1>
        </header>

        <ErrorBoundary
          fallback={(err, reset) => (
            <Shell as="section" aria-label={`${sportName()} ${boardLabel()} leaderboard`}>
              <LeaderboardErrorFace err={err} reset={reset} />
            </Shell>
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
              <Show when={showNewsScopeToggle()}>
                <Select
                  options={NEWS_SCOPE_OPTIONS}
                  value={newsScope()}
                  onChange={(id) => setParams({ newsScope: id === "current_week" ? null : id })}
                  ariaLabel="News scope"
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

        {/* Leaderboards explicitly keep the existing accent-circle fallback
            instead of adopting profile cards' target-ID corner numerals. */}
        <Shell
          as="section"
          aria-label={`${sportName()} ${boardLabel()} leaderboard`}
        >
          <Show when={data()} fallback={<LeaderboardLoadingFace label={`${sportName()} ${boardLabel()} leaderboard`} />}>
            <Show
              when={dataError()}
              keyed
              fallback={
                <Show
                  when={rows().length > 0}
                  fallback={<LeaderboardEmptyFace />}
                >
                  <ol class="lb-rows">
                    <For each={rows()}>
                      {(r) => (
                        <li class="lb-row">
                          <span class="lb-rank">{r.rank ?? "—"}</span>
                          <span class="lb-avatar-wrap">
                            <Show
                              when={r.avatar}
                              fallback={<span class="lb-avatar lb-avatar-mono" classList={{ "lb-round": r.round }}>{r.name.charAt(0)}</span>}
                            >
                              {(src) => (
                                <img
                                  class="lb-avatar"
                                  classList={{ "lb-round": r.round }}
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
                                <Show when={r.subAccent}>
                                  {(a) => (
                                    <>
                                      {r.sub ? " · " : ""}
                                      <span style={{ color: a().color }}>{a().text}</span>
                                    </>
                                  )}
                                </Show>
                              </span>
                            </Show>
                          </a>
                          <span class="lb-metric-cell">
                            <span class="lb-metric" style={r.metricColor ? { color: r.metricColor } : undefined}>
                              {r.metric}
                            </span>
                            <span class="lb-metric-label">{r.metricLabel}</span>
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
              {(err) => <LeaderboardErrorFace err={err} reset={retryLeaderboard} />}
            </Show>
          </Show>
        </Shell>
      </ErrorBoundary>

      <GutterAds />
      </main>
    </>
  );
}

function LeaderboardErrorFace(props: { err: unknown; reset: () => void }) {
  const message = props.err instanceof Error ? props.err.message : String(props.err);
  return (
    <div class="lb-state-face lb-empty-face" role="alert" aria-label="Leaderboard unavailable">
      <div class="lb-empty-art" aria-hidden="true">
        <img src={`/vibe-art/${VEIL_ARCHETYPE.slug}.svg`} alt="" />
      </div>
      <div class="lb-empty-name">{VEIL_ARCHETYPE.name.toUpperCase()}</div>
      <div class="lb-empty-text">Couldn&apos;t load this board.</div>
      <div class="lb-empty-note">{message}</div>
      <button type="button" class="card-error-retry" onClick={props.reset}>
        Try again
      </button>
    </div>
  );
}

function LeaderboardLoadingFace(props: { label: string }) {
  return (
    <div
      class="lb-state-face deck-back-loading"
      role="status"
      aria-live="polite"
      aria-label={`${props.label} loading`}
    >
      <img
        class="deck-back-loading-art"
        src="/vibe-art/deck-back.svg"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}

function LeaderboardEmptyFace() {
  return (
    <div class="lb-state-face lb-empty-face" aria-label="No leaderboard entries">
      <div class="lb-empty-art" aria-hidden="true">
        <img src={`/vibe-art/${VEIL_ARCHETYPE.slug}.svg`} alt="" />
      </div>
      <div class="lb-empty-name">{VEIL_ARCHETYPE.name.toUpperCase()}</div>
      <div class="lb-empty-text">{VEIL_ARCHETYPE.vibe}</div>
      <div class="lb-empty-note">No reading on this board yet.</div>
    </div>
  );
}
