/**
 * /leaderboard — the sport-wide stack-rank page.
 *
 * Standalone (NOT a profile sub-tab): sport-scoped, no entity context, so it
 * renders with the pillar primitives directly (<Shell> + <NavStrip>) rather than
 * <Card> (which needs ProfileContext). Four discovery boards behind one rail
 * (Sigil convergence — NOT the "Big 3" headline scores; the Sigil synthesis is a
 * profile crown, not a leaderboard rank):
 *
 *   Rating    — the z-score rating board (getLeaderboard, composite scope), with
 *               a season filter (?season=, defaults to the latest rated season)
 *   News      — hottest Gemma narratives by per-narrative impact (getNewsLeaderboard)
 *   Vibe      — the Vibe end product surfaced here (its only public surface, no
 *               profile card): latest sentiment 1-100 + the felt-read blurb
 *               (getVibesLeaderboard → vibe_scores)
 *   Transfers — hottest Gemma-vetted rumors by heat (getTransfersLeaderboard)
 *
 * (Fantasy stays URL-reachable via ?board=fantasy but is off the visible rail.)
 *
 * All state lives on the URL (?sport, ?board, ?type, ?season) so a board is shareable and
 * survives reload — read reactively via useSearchParams so a single dispatch
 * createAsync re-fetches only the active board on any change. Sport comes from
 * the home selector (?sport=), falling back to the $currentSport store.
 */

import { createMemo, createSignal, Show, For, onMount } from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { useStore } from "@nanostores/solid";

import { SPORTS } from "../lib/types";
import { $currentSport, setSport } from "../stores/sport";
import { shareCard } from "../lib/share/dispatch";
import ShareFallbackModal from "../components/solid/ShareFallbackModal";
import {
  getLeaderboard,
  getVibesLeaderboard,
  getTrendingLeaderboard,
  getNewsLeaderboard,
  getTransfersLeaderboard,
  type VibeLeader,
  type TrendingLeader,
  type NewsLeader,
  type TransferLeader,
  type LeaderboardEntry,
} from "../lib/data/leaderboard.server";
import { tierColor, tierColorScore } from "../lib/utils/tier-color";
import { transferStageLabel, transferStageColor } from "../lib/utils/transfer-stage";
import { transferNoun, CARD_META, fantasySupported } from "../lib/cards/card-meta";
import NavStrip from "../components/solid/NavStrip";
import ScopeStrip from "../components/solid/ScopeStrip";
import Select from "../components/solid/Select";
import SearchControl from "../components/solid/SearchControl";
import Shell from "../components/solid/Shell";
import Skeleton from "../components/solid/Skeleton";
import GutterAds from "../components/solid/GutterAds";
import GemmaSummary from "../components/solid/GemmaSummary";
import "./leaderboard.css";

type BoardId = "composite" | "fantasy" | "vibes" | "trending" | "news" | "transfers";

// Discovery boards (Sigil convergence): Rating · News · Vibe · Transfers. The Vibe
// (sentiment + prompt) gets its only public surface here — it has no profile card.
// (Fantasy stays URL-reachable via ?board=fantasy but is off the visible rail.)
const BOARD_ITEMS: ReadonlyArray<{ id: BoardId; label: string }> = [
  { id: "composite", label: "Rating" },
  { id: "news", label: "News" },
  { id: "vibes", label: "Vibe" },
  { id: "trending", label: "Trending" },
  { id: "transfers", label: "Transfers" },
];

const TYPE_OPTIONS = [
  { value: "player" as const, label: "Players" },
  { value: "team" as const, label: "Teams" },
];

// Trending board scope — which trajectory's risers to rank.
const METRIC_OPTIONS = [
  { value: "vibe" as const, label: "Vibe risers" },
  { value: "rating" as const, label: "Rating risers" },
];

const SPORT_DISPLAY: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.idLower, s.display]),
);

const BOARD_BLURB: Record<BoardId, string> = {
  composite: "Positionless z-score rating",
  fantasy: "Most fantasy points (PPR / DraftKings)",
  vibes: "Highest sentiment, last 48h",
  trending: "Biggest risers — vibe or rating",
  news: "Hottest narratives by impact",
  transfers: "Hottest rumors by heat index",
};

const LIMIT = 50;

function profileHref(sport: string, type: string, id: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=${type}&id=${id}`;
}

/** One row, normalized across every board so the list has a single render path. */
interface DisplayRow {
  rank: number;
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
}

export default function Leaderboard() {
  const [params, setParams] = useSearchParams<{
    sport?: string;
    board?: string;
    type?: string;
    season?: string;
    metric?: string;
  }>();
  const storeSport = useStore($currentSport);

  const sport = () => (params.sport ?? storeSport() ?? "nba").toLowerCase();
  const board = (): BoardId => {
    const b = params.board;
    if (b === "fantasy") return fantasySupported(sport()) ? "fantasy" : "composite";
    return b === "vibes" || b === "news" || b === "transfers" || b === "trending" ? b : "composite";
  };
  const entityType = (): "player" | "team" => (params.type === "team" ? "team" : "player");
  // Trending metric scope — vibe risers (default) or rating risers.
  const metric = (): "vibe" | "rating" => (params.metric === "rating" ? "rating" : "vibe");
  // transfers are always pairs; fantasy is players-only.
  const showTypeToggle = () => board() !== "transfers" && board() !== "fantasy";
  // The vibe/rating scope toggle is the Trending board's distinguishing control.
  const showMetricToggle = () => board() === "trending";
  // Season filter — Rating board only. Null ⇒ the backend's latest rated season.
  const seasonParam = (): number | null => {
    const n = Number(params.season);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // Keep the rest of the site's sport in sync when arriving with an explicit
  // ?sport= (e.g. from the home dropdown), so a later nav to a profile matches.
  onMount(() => {
    if (params.sport) setSport(sport());
  });

  // ONE dispatch: re-runs on sport / board / entityType change, fetches only the
  // active board. Returns a discriminated payload the row-mapper normalizes.
  const data = createAsync(async () => {
    const s = sport();
    const et = entityType();
    const b = board();
    if (b === "vibes") {
      const r = await getVibesLeaderboard(s, et, LIMIT);
      return { kind: "vibes" as const, rows: r?.leaders ?? [] };
    }
    if (b === "trending") {
      const r = await getTrendingLeaderboard(s, et, metric(), LIMIT);
      return { kind: "trending" as const, rows: r?.leaders ?? [], metric: metric() };
    }
    if (b === "news") {
      const r = await getNewsLeaderboard(s, et, LIMIT);
      return { kind: "news" as const, rows: r?.leaders ?? [] };
    }
    if (b === "transfers") {
      const r = await getTransfersLeaderboard(s, LIMIT);
      return { kind: "transfers" as const, rows: r?.rumors ?? [] };
    }
    if (b === "fantasy") {
      // Players-only; ranked by box-score fantasy points (scope="fantasy").
      const r = await getLeaderboard(s, "player", "fantasy", seasonParam(), LIMIT);
      return {
        kind: "fantasy" as const,
        rows: r?.leaders ?? [],
        seasons: r?.available_seasons ?? [],
        season: r?.season ?? null,
      };
    }
    const r = await getLeaderboard(s, et, "composite", seasonParam(), LIMIT);
    return {
      kind: "composite" as const,
      rows: r?.leaders ?? [],
      seasons: r?.available_seasons ?? [],
      season: r?.season ?? null,
    };
  });

  const fmtSub = (parts: Array<string | null | undefined>) =>
    parts.filter(Boolean).join(" · ") || null;

  const rows = createMemo<DisplayRow[]>(() => {
    const d = data();
    if (!d) return [];
    const s = sport();
    if (d.kind === "transfers") {
      return (d.rows as TransferLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, "player", r.player_id),
        avatar: r.player_image,
        round: true,
        crest: r.team_logo,
        name: r.player_name,
        sub: fmtSub([r.team_name, r.direction]),
        subAccent: r.stage ? { text: transferStageLabel(r.stage), color: transferStageColor(r.stage) } : null,
        metric: String(r.heat),
        metricColor: tierColor(r.heat),
        metricLabel: "Heat",
        blurb: r.gemma_summary,
      }));
    }
    if (d.kind === "composite") {
      return (d.rows as LeaderboardEntry[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id),
        avatar: r.image,
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.entity_type === "player" ? r.team_code : null, r.position]),
        // Magnitude is players-only; teams keep the percentile rank.
        metric: r.entity_type === "team"
          ? String(r.rating_composite_rank)
          : r.rating_composite_score.toFixed(1),
        metricColor: r.entity_type === "team"
          ? tierColor(r.rating_composite_rank)
          : tierColorScore(r.rating_composite_score),
        metricLabel: "Rating",
      }));
    }
    if (d.kind === "fantasy") {
      // Metric is the fantasy-points total; the chip color reads its percentile.
      return (d.rows as LeaderboardEntry[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, "player", r.id),
        avatar: r.image,
        round: true,
        crest: r.team_logo,
        name: r.name,
        sub: fmtSub([r.team_code, r.position]),
        metric: (r.fantasy_points ?? 0).toFixed(1),
        metricColor: tierColor(r.fantasy_rank ?? 0),
        metricLabel: "Fantasy",
      }));
    }
    if (d.kind === "news") {
      // news board (NewsLeader): the hottest narrative, ranked by impact; the
      // headline is the sub-line, the write-up the expandable blurb.
      return (d.rows as NewsLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id),
        avatar: r.image,
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: r.narrative_title,
        metric: String(r.score),
        metricColor: tierColor(r.score),
        metricLabel: "Impact",
        blurb: r.body,
      }));
    }
    if (d.kind === "trending") {
      // trending board (TrendingLeader): the risers — the recent rise (+N) as the metric,
      // green-coloured (rising); scoped to vibe or rating via the metric toggle.
      return (d.rows as TrendingLeader[]).map((r) => ({
        rank: r.rank,
        href: profileHref(s, r.entity_type, r.id),
        avatar: r.image,
        round: r.entity_type === "player",
        crest: r.entity_type === "player" ? r.team_logo : null,
        name: r.name,
        sub: fmtSub([r.team_code]),
        metric: `+${r.score}`,
        metricColor: tierColor(85),
        metricLabel: d.metric === "rating" ? "Rating ▲" : "Vibe ▲",
      }));
    }
    // vibe board (VibeLeader): the Vibe end product — latest sentiment as the metric,
    // the felt-read prompt as the expandable blurb (its only public surface).
    return (d.rows as VibeLeader[]).map((r) => ({
      rank: r.rank,
      href: profileHref(s, r.entity_type, r.id),
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
  // The Transfers board reads "Trades" for nba/nfl (football keeps "Transfers").
  // Drives the tab rail, the page/share title, and the section aria-labels.
  const boardItems = () =>
    BOARD_ITEMS.map((b) => (b.id === "transfers" ? { ...b, label: transferNoun(sport()) } : b));
  const boardLabel = () => boardItems().find((b) => b.id === board())?.label ?? "Rating";

  // Rating board's season dropdown: options come from the response's
  // available_seasons; the selected value is the requested season or the latest.
  const ratingSeasons = (): number[] => {
    const d = data();
    return d && (d.kind === "composite" || d.kind === "fantasy") ? d.seasons : [];
  };
  const seasonOptions = () => ratingSeasons().map((s) => ({ value: String(s), label: String(s) }));
  const selectedSeason = (): number | null => {
    const d = data();
    return seasonParam() ?? (d && (d.kind === "composite" || d.kind === "fantasy") ? d.season : null);
  };

  // Share: the OG image is the server-rendered top-N snapshot; the canonical URL
  // is this board's page (crawlers fetch og:image from it).
  const ogImageUrl = () =>
    `https://scoracle.com/og/leaderboard/${sport()}/${entityType()}/${board()}`;
  const canonicalUrl = () => {
    const p = new URLSearchParams({ sport: sport().toUpperCase() });
    if (board() !== "composite") p.set("board", board());
    if (entityType() === "team") p.set("type", "team");
    return `https://scoracle.com/leaderboard?${p.toString()}`;
  };
  const shareTitle = () => `${sportName()} ${boardLabel()} Leaderboard`;

  const [shareFallback, setShareFallback] = createSignal<{ text: string; url: string } | null>(null);
  async function shareBoard() {
    const url = typeof window !== "undefined" ? window.location.href : canonicalUrl();
    const text = `${sportName()} ${boardLabel()} leaderboard on Scoracle`;
    const res = await shareCard({ title: shareTitle(), text, url });
    if (res.kind === "fallback") setShareFallback({ text, url });
  }

  return (
    <main class="lb-main">
      <Title>{`${shareTitle()} · Scoracle`}</Title>
      <Meta property="og:title" content={`${shareTitle()} · Scoracle`} />
      <Meta property="og:description" content={BOARD_BLURB[board()]} />
      <Meta property="og:url" content={canonicalUrl()} />
      <Meta property="og:image" content={ogImageUrl()} />
      <Meta name="twitter:image" content={ogImageUrl()} />

      <header class="lb-headline">
        <h1 class="lb-title">{sportName()} Leaderboard</h1>
        <p class="lb-blurb">{BOARD_BLURB[board()]}</p>
        {/* Share is paused platform-wide — gated on the card-meta registry flag
            (same one switch as the profile Cards' ShareTrigger). */}
        <Show when={CARD_META.leaderboard.shareable}>
          <button type="button" class="lb-share" aria-label="Share this leaderboard" onClick={shareBoard}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor"
                 stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M13 6.5 V4 H4 v10 h9 v-2.5" />
              <path d="M9 7 L15 1" />
              <path d="M11 1 H15 V5" />
            </svg>
            Share
          </button>
        </Show>
      </header>

      <NavStrip
        items={boardItems()}
        active={board()}
        onSelect={(id) => setParams({ board: id === "composite" ? null : id })}
        ariaLabel="Select leaderboard"
      />

      <ScopeStrip ariaLabel="Leaderboard view controls">
        <Show when={showTypeToggle()}>
          <Select
            options={TYPE_OPTIONS}
            value={entityType()}
            onChange={(id) => setParams({ type: id === "player" ? null : id })}
            ariaLabel="Players or teams"
          />
        </Show>
        <Show when={showMetricToggle()}>
          <Select
            options={METRIC_OPTIONS}
            value={metric()}
            onChange={(id) => setParams({ metric: id === "vibe" ? null : id })}
            ariaLabel="Trending metric"
          />
        </Show>
        <Show when={(board() === "composite" || board() === "fantasy") && ratingSeasons().length > 1}>
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
        <SearchControl sport={sport()} entityType={entityType()} />
      </ScopeStrip>

      <Shell as="section" aria-label={`${sportName()} ${boardLabel()} leaderboard`}>
        <Show when={data()} fallback={<BoardSkeleton />}>
          <Show
            when={rows().length > 0}
            fallback={<p class="lb-empty">Nothing on this board yet.</p>}
          >
            <ol class="lb-rows">
              <For each={rows()}>
                {(r) => (
                  <li class="lb-row">
                    <span class="lb-rank">{r.rank}</span>
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
                      {(b) => <GemmaSummary text={b()} class="lb-row-blurb" />}
                    </Show>
                  </li>
                )}
              </For>
            </ol>
          </Show>
        </Show>
      </Shell>

      <GutterAds />

      <Show when={shareFallback()}>
        {(s) => (
          <ShareFallbackModal text={s().text} url={s().url} onClose={() => setShareFallback(null)} />
        )}
      </Show>
    </main>
  );
}

function BoardSkeleton() {
  return (
    <ol class="lb-rows" aria-hidden="true">
      <For each={Array.from({ length: 10 })}>
        {() => (
          <li class="lb-row">
            <Skeleton shape="line" width={18} height={14} />
            <Skeleton shape="circle" width={34} height={34} />
            <Skeleton shape="line" width={160} height={16} />
            <Skeleton shape="line" width={40} height={20} />
          </li>
        )}
      </For>
    </ol>
  );
}
