import { createUrlState } from '../lib/url-state';
import { createProduct } from '../lib/product';
import { createBoardProducts } from '../lib/board-products';
import { publishBoardSport } from '../lib/board-sport';
import { imageUrl } from "../lib/utils/image-url";


/** Ranked discovery through the backend's current products. URL state selects
 * the board, sport, season and cohort for both preloading and rendering. */
import { createEffect, createMemo, createSignal, Show, For, onMount, on, untrack } from "solid-js";



import { SPORTS } from "../lib/types";

import type { VibeLeader, SigilLeader, TrendingLeader, NewsLeader, TransferLeader, LeaderboardEntry } from "../lib/data/leaderboard";
import type { AutocompleteEntity, TeamMeta } from "../lib/types";
import { tierColor, tierColorScore } from "../lib/utils/tier-color";
import { transferStageLabel } from "../lib/utils/transfer-stage";

import { profilePath } from "../lib/utils/profile-url";
import { transferNoun, type CardId } from "../lib/cards/card-meta";
import { newsTrajectoryLabel, sourceAttribution } from "../lib/utils/news-display";
import NavWell from "../components/NavWell";
import Select from "../components/Select";
import Board, { BoardEmpty, BoardError, BoardLoading } from "../components/Board";
import GemmaSummary from "../components/GemmaSummary";
import "../routes/leaderboard.css";

import { boardSource, boardQuery, boardCanonical, BOARD_ITEMS, BOARD_BLURB, type BoardId } from "../lib/utils/board-query";
// Sport — the first Select on the conditions line (a scope, not a product:
// it changes the lens, not the story). Values are the lowercase ids.
const SPORT_OPTIONS: ReadonlyArray<{
    value: string;
    label: string;
}> = SPORTS.map((s) => ({
    value: s.idLower,
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
const SPORT_DISPLAY: Record<string, string> = Object.fromEntries(SPORTS.map((s) => [s.idLower, s.display]));
function profileHref(sport: string, type: string, id: number, name: string, tab?: string): string {
    return profilePath(sport, type, id, { name, tab });
}
function stripTrailingAttribution(text: string | null | undefined, sourceNames?: readonly string[] | null): string | null {
    const trimmed = text?.trim();
    if (!trimmed)
        return null;
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
    if (magnitude >= 25)
        return tierColor(90);
    if (magnitude >= 15)
        return tierColor(70);
    if (magnitude >= 8)
        return tierColor(50);
    if (magnitude >= 4)
        return tierColor(30);
    return tierColor(10);
}
/** One row, normalized across every board so the list has a single render path. */
interface DisplayRow {
    rank: number | null;
    key?: string;
    href: string;
    avatar: string | null;
    /** True for player headshots (cropped square), false for crests and logos
     *  (fitted whole). Media prints FLAT on the sheet either way — no frame,
     *  no fill, no seat (Scott, 2026-08-10). */
    photo: boolean;
    teamId?: number | null;
    crest: string | null; // small overlaid team badge (players only)
    name: string;
    sub: string | null;
    subAccent?: string | null;
    metric: string;
    metricColor: string | null; // tierColor for 0-100 scales; null = neutral count
    /** Expandable detail (transfers: Gemma's grounded blurb). Absent → no toggle. */
    blurb?: string | null;
    blurbSource?: string | null;
    /** Clamp the detail to a whisper (sigil board: the Oracle reading is 2-4
     *  sentences — the board shows one line, the profile card speaks it whole). */
    blurbClamp?: boolean;
}
/** One URL interpretation for intent preloading and mounted async reads. */
/** The small team badge overlaid on a player's headshot.
 *
 * These badge URLs are third-party (provider CDNs, and for some teams a
 * Wikipedia logo) and they do go dead — the Kansas City Chiefs crest 404s
 * permanently. A broken-image glyph inside a composed row is a visible defect,
 * so a failure removes the badge. Nothing is lost: the headshot beside it is
 * the primary image and carries its own monogram fallback.
 *
 * Owns its own failure flag because it renders inside a keyed <For>, whose row
 * closure cannot hold per-row state. Also re-checks after hydration for a badge
 * that 404'd before `onError` could be attached.
 */
function RowCrest(props: { src: string }) {
    const [failed, setFailed] = createSignal(false);
    let el: HTMLImageElement | undefined;
    onMount(() => {
        if (el?.isConnected && el.complete && el.naturalWidth === 0)
            setFailed(true);
    });
    return (
        <Show when={!failed()}>
            <img class="lb-crest" src={imageUrl(props.src, 64)} alt="" loading="lazy" ref={el} onError={() => setFailed(true)}/>
        </Show>
    );
}

export default function LeaderboardExplorer(props: { initialSearch: string }) {
    const url = createUrlState(props.initialSearch);
    const params = (key: string) => new URLSearchParams(url.search()).get(key) ?? undefined;
    const setParams = url.replaceAll;
    onMount(() => {
      if (["newsScope", "week", "year", "date", "status"].some(key => params(key) !== undefined) || params("board") === "stories")
        setParams({ newsScope: null, week: null, year: null, date: null, status: null, ...(params("board") === "stories" ? { board: null } : {}) });
    });
    const source = boardSource(params);
    const { sport, board, entityType, metric, seasonParam, leagueId, conference, division, positionGroup, rate } = source;
    // Which tab is lit: the off-rail boards light their parent (transfers is
    // the Narratives facet; fantasy is a rating scope).
    const activeTab = (): BoardId => {
        const b = board();
        if (b === "transfers")
            return "news";
        if (b === "fantasy")
            return "rating";
        return b;
    };
    // Switching boards keeps the sport and the entity type; every board-
    // specific scope (metric, season, rate, status) and
    // the cohort filters reset — the same clean slate the tray links gave.
    const selectBoard = (id: string) => setParams({
        board: id === "rating" ? null : id,
        metric: null,
        newsScope: null,
        season: null,
        rate: null,
        week: null,
        status: null,
        leagueId: null,
        conference: null,
        division: null,
        teamId: null,
        positionGroup: null,
    });
    // Momentum metric scope — vibe risers (default) or rating risers.
    // Transfers are always pairs; fantasy is players-only.
    const showTypeToggle = () => board() !== "transfers" && board() !== "fantasy";
    // The vibe/rating scope toggle is the Momentum board's distinguishing control.
    const showMetricToggle = () => board() === "momentum";
    const showNewsViewToggle = () => board() === "news" || board() === "transfers";
    // Season filter — Rating board only. Null ⇒ the backend's latest rated season.
    // Per-x ranking on the rating board (players): rank by a rating_modes block.
    const RATE_OPTIONS: Record<string, {
        value: string;
        label: string;
    }[]> = {
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
    const products = createBoardProducts();
    const optionsProduct = createProduct<{ teams: TeamMeta[]; positions: string[] }>();
    const sportKey = createMemo(sport);
    const requestKey = createMemo(() => `/api/board?${boardQuery(source)}`);
    const warmKeys = createMemo(() => BOARD_ITEMS.map(item => `/api/board?${boardQuery(boardSource(key => ({ sport: sport(), type: entityType(), board: item.id }[key])))}`).join('\n'));
    const loadBoards = () => untrack(() => products.select(requestKey(), warmKeys().split('\n')));
    const loadOptions = () => optionsProduct.load(`/api/board-options?sport=${sportKey()}`);
    onMount(() => { loadBoards(); void loadOptions(); publishBoardSport(sport()); });
    createEffect(on([requestKey, warmKeys], loadBoards, { defer: true }));
    createEffect(on(sportKey, () => { void loadOptions(); publishBoardSport(sport()); }, { defer: true }));
    const options = createMemo(() => {
      const state = optionsProduct.state();
      return state.status === 'success' ? state.data : { teams: [], positions: [] };
    });
    const teamEntities = createMemo(() => options().teams.map(team => ({
        id: String(team.id), name: team.name, type: "team" as const, sport: sport(),
    })).sort((a, b) => a.name.localeCompare(b.name)));
    const scopeTeamMeta = createMemo(() => Object.fromEntries(options().teams.map(team => [String(team.id), team])));
    const teamMeta = (team: AutocompleteEntity): TeamMeta | undefined => scopeTeamMeta()[team.id];
    const teamMatchesScope = (team: AutocompleteEntity, scope: {
        leagueId?: number | null;
        conference?: string | null;
        division?: string | null;
    }) => {
        const meta = teamMeta(team);
        if (scope.leagueId && meta?.league?.id !== scope.leagueId)
            return false;
        if (scope.conference && meta?.conference !== scope.conference)
            return false;
        if (scope.division && meta?.division !== scope.division)
            return false;
        return true;
    };
    const scopedTeamEntities = (scope: {
        leagueId?: number | null;
        conference?: string | null;
        division?: string | null;
    }) => teamEntities().filter((team) => teamMatchesScope(team, scope));
    const leagueOptions = createMemo(() => {
        const seen = new Map<number, string>();
        for (const team of teamEntities()) {
            const league = teamMeta(team)?.league;
            if (league?.id && !seen.has(league.id))
                seen.set(league.id, league.name);
        }
        return [
            { value: "all", label: "All leagues" },
            ...[...seen.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([id, label]) => ({ value: String(id), label })),
        ];
    });
    const conferenceOptions = createMemo(() => {
        const values = new Set<string>();
        for (const team of scopedTeamEntities({ leagueId: leagueId() })) {
            const meta = teamMeta(team);
            if (meta?.conference)
                values.add(meta.conference);
        }
        return [{ value: "all", label: "All conferences" }, ...[...values].sort().map((v) => ({ value: v, label: v }))];
    });
    const divisionOptions = createMemo(() => {
        const values = new Set<string>();
        for (const team of scopedTeamEntities({ leagueId: leagueId(), conference: conference() })) {
            const meta = teamMeta(team);
            if (meta?.division)
                values.add(meta.division);
        }
        return [{ value: "all", label: "All divisions" }, ...[...values].sort().map((v) => ({ value: v, label: v }))];
    });
    const teamOptions = createMemo(() => [
        { value: "all", label: "All teams" },
        ...scopedTeamEntities({ leagueId: leagueId(), conference: conference(), division: division() })
            .map((team) => ({ value: team.id, label: team.name })),
    ]);
    const positionGroupOptions = createMemo(() => [
        { value: "all", label: "All positions" },
        ...options().positions.map(value => ({ value, label: value })),
    ]);
    const data = createMemo(() => {
      const state = products.state();
      if (state.status !== 'success') return null;
      return { kind: board(), rows: state.data.leaders ?? state.data.rumors ?? [], seasons: state.data.available_seasons ?? [], season: state.data.season ?? null };
    });

    const fmtSub = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ") || null;
    const rows = createMemo<DisplayRow[]>(() => {
        const d = data();
        if (!d)
            return [];
        const s = sport();
        if (d.kind === "transfers") {
            return (d.rows as TransferLeader[]).map((r) => ({
                rank: r.rank,
                key: `${r.player_id}:${r.team_id}`,
                href: profileHref(s, "player", r.player_id, r.player_name, "transfers"),
                avatar: r.player_image,
                photo: true,
                teamId: r.team_id,
                crest: r.team_logo,
                name: r.player_name,
                sub: fmtSub([r.team_name, r.direction, newsTrajectoryLabel(r.trajectory, r.trajectory_label)]),
                subAccent: r.stage ? transferStageLabel(r.stage) : null,
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
                teamId: r.team_id,
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
                teamId: r.team_id,
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
                teamId: r.team_id,
                crest: r.entity_type === "player" ? r.team_logo : null,
                name: r.name,
                sub: r.headline,
                subAccent: newsTrajectoryLabel(r.trajectory, r.trajectory_label),
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
                teamId: r.team_id,
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
                teamId: r.team_id,
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
            href: profileHref(s, r.entity_type, r.id, r.name, "vibe"),
            avatar: r.image,
            photo: r.entity_type === "player",
            teamId: r.team_id,
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
        if (board() === "transfers")
            return transferNoun(sport());
        if (board() === "fantasy")
            return "Fantasy";
        return BOARD_ITEMS.find((b) => b.id === board())?.label ?? "Scouting";
    };
    // Rating board's season dropdown: options come from the response's
    // available_seasons; the selected value is the requested season or the latest.
    /* All three memoized: each re-derived its slice of the board payload on
       every read, and each is read more than once per render (the Select's
       value, its <Show when={…length}>, and the options). */
    const ratingSeasons = createMemo((): number[] => {
        const d = data();
        return d && (d.kind === "rating" || d.kind === "fantasy") ? d.seasons : [];
    });
    const seasonOptions = createMemo(() => ratingSeasons().map((s) => ({ value: String(s), label: String(s) })));
    const selectedSeason = createMemo((): number | null => {
        const d = data();
        return seasonParam() ?? (d && (d.kind === "rating" || d.kind === "fantasy" || d.kind === "sigil") ? d.season : null);
    });
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
    const scopeLine = (): string => {
        const parts: (string | null)[] = [sportName()];
        parts.push(board() === "transfers" || board() === "fantasy"
            ? "players"
            : entityType() === "team" ? "teams" : "players");
        const b = board();
        if (b === "rating" || b === "fantasy" || b === "sigil") {
            const season = selectedSeason();
            if (season)
                parts.push(`${season} season`);
        }
        if (b === "news" || b === "transfers")
            parts.push("latest output");
        if (b === "momentum")
            parts.push(metric() === "rating" ? "rating trajectory" : "vibe trajectory");
        return parts.filter(Boolean).join(" · ");
    };
    const canonicalUrl = () => boardCanonical(source);
    const pageTitle = () => `${sportName()} ${boardLabel()} Leaderboard`;
    createEffect(() => {
      const title = `${pageTitle()} · Scoracle`;
      document.title = title;
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl());
      for (const [selector, value] of [
        ['meta[property="og:title"]', title], ['meta[name="twitter:title"]', title],
        ['meta[property="og:description"]', BOARD_BLURB[board()]], ['meta[name="description"]', BOARD_BLURB[board()]],
        ['meta[name="twitter:description"]', BOARD_BLURB[board()]], ['meta[property="og:url"]', canonicalUrl()],
      ]) document.querySelector(selector)?.setAttribute('content', value);
    });
    return (<>
          {/* Board tabs on top (tabs = products); the conditions line below,
        opening with the sport (conditions = scopes). Both in the well. */}
          <NavWell items={BOARD_ITEMS} active={activeTab()} onSelect={selectBoard} ariaLabel="Select leaderboard" conditionsAriaLabel="Leaderboard view controls" conditions={<>
              <Select options={SPORT_OPTIONS} value={sport()} onChange={(id) => setParams({ sport: id.toUpperCase(), leagueId: null, conference: null, division: null, teamId: null, positionGroup: null })} ariaLabel="Sport"/>
              <Show when={showTypeToggle()}>
                <Select options={TYPE_OPTIONS} value={entityType()} onChange={(id) => setParams({ type: id === "player" ? null : id, positionGroup: null })} ariaLabel="Players or teams"/>
              </Show>
              <Show when={leagueOptions().length > 1}>
                <Select options={leagueOptions()} value={params("leagueId") ?? "all"} onChange={(id) => setParams({ leagueId: id === "all" ? null : id, conference: null, division: null, teamId: null })} ariaLabel="League"/>
              </Show>
              <Show when={conferenceOptions().length > 1}>
                <Select options={conferenceOptions()} value={conference() ?? "all"} onChange={(id) => setParams({ conference: id === "all" ? null : id, division: null, teamId: null })} ariaLabel="Conference"/>
              </Show>
              <Show when={divisionOptions().length > 1}>
                <Select options={divisionOptions()} value={division() ?? "all"} onChange={(id) => setParams({ division: id === "all" ? null : id, teamId: null })} ariaLabel="Division"/>
              </Show>
              <Show when={teamOptions().length > 1}>
                <Select options={teamOptions()} value={params("teamId") ?? "all"} onChange={(id) => setParams({ teamId: id === "all" ? null : id })} ariaLabel="Team"/>
              </Show>
              <Show when={entityType() === "player" && positionGroupOptions().length > 1}>
                <Select options={positionGroupOptions()} value={positionGroup() ?? "all"} onChange={(id) => setParams({ positionGroup: id === "all" ? null : id })} ariaLabel="Position group"/>
              </Show>
              <Show when={showMetricToggle()}>
                <Select options={METRIC_OPTIONS} value={metric()} onChange={(id) => setParams({ metric: id === "vibe" ? null : id })} ariaLabel="Momentum metric"/>
              </Show>
              {/* Transfers/Trades shares the Narratives rail item. */}
              <Show when={showNewsViewToggle()}>
                <Select options={[
                { value: "news", label: "Narratives" },
                { value: "transfers", label: transferNoun(sport()) },
            ]} value={board()} onChange={(id) => setParams({ board: id })} ariaLabel="News view"/>
              </Show>
              {/* Per-x ranking (the scope collapse, 2026-09-05): rank the
            rating board by a per-x block — the rate ladder the Profile
            chart speaks, applied to the whole cohort. */}
              <Show when={board() === "rating" && entityType() === "player" && rateOptions().length > 1}>
                <Select options={rateOptions()} value={rate() ?? "default"} onChange={(v) => setParams({ rate: v === "default" ? null : v })} ariaLabel="Rate"/>
              </Show>
              <Show when={(board() === "rating" || board() === "fantasy") && ratingSeasons().length > 1}>
                <Select options={seasonOptions()} value={String(selectedSeason() ?? "")} onChange={(v) => {
                const yr = Number(v);
                // Drop the param at the latest season for a clean, shareable URL.
                setParams({ season: yr === ratingSeasons()[0] ? null : String(yr) });
            }} ariaLabel="Season"/>
              </Show>
            </>}/>

        <Show when={optionsProduct.state().status === 'error'}>
          <div role="alert">Board controls could not be read. <button type="button" onClick={() => void loadOptions()}>Retry controls</button></div>
        </Show>
        <Board title={boardLabel()} titleAsHeading deck={BOARD_DECK[board()]} scope={scopeLine()} metricLabel={rows().length > 0 ? metricLabel() : null} count={rows().length > 0 ? `${rows().length} ranked` : null} ariaLabel={`${sportName()} ${boardLabel()} leaderboard`}>

    <Show when={products.state().status !== 'pending'} fallback={<BoardLoading label={`${sportName()} ${boardLabel()} loading`} />}>
    <Show when={products.state().status !== 'error'} fallback={<BoardError onRetry={products.retry} />}>
    <Show when={rows().length > 0} fallback={<BoardEmpty ariaLabel="No leaderboard entries"/>}>
                  <ol class="board-register">
                    {/* Transfer pairs can share a player; other boards have one row per entity. */}
                    <For each={rows()}>
                      {(r) => (<li class="board-row">
                          {/* The spine — Board.css owns its type and its four
ink bands; the row only supplies the numeral. */}
                          <span class="board-rank">{r.rank != null ? String(r.rank).padStart(2, "0") : "—"}</span>
                          <span class="lb-media">
                            <Show when={imageUrl(r.avatar, 128, sport())} fallback={<span class="lb-media-mono">{r.name.charAt(0)}</span>}>
                              {(src) => (<img src={src()} alt="" loading="lazy" class="lb-media-img" classList={{ "lb-media-photo": r.photo }}/>)}
                            </Show>
                            <Show when={r.crest}>
                              {(c) => <RowCrest src={scopeTeamMeta()[String(r.teamId)]?.logo_url || c()}/>}
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
                                  {(a) => (<>
                                      {r.sub ? " · " : ""}
                                      <span class="lb-sub-accent">{a()}</span>
                                    </>)}
                                </Show>
                              </span>
                            </Show>
                          </a>
                          {/* The metric is named once, at the head of its
column (Board doctrine) — never per row. */}
                          <span class="lb-metric" style={{ "--metric-color": r.metricColor ?? "var(--text)" }}>
                            {r.metric}
                          </span>
                          <Show when={r.blurb}>
                            {(b) => (<GemmaSummary text={b()} source={r.blurbSource} class={`lb-row-blurb${r.blurbClamp ? " lb-row-blurb--clamp" : ""}`}/>)}
                          </Show>
                        </li>)}
                    </For>
                  </ol>
                </Show>

    </Show></Show>
        </Board>
    </>);
}
