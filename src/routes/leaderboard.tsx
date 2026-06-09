/**
 * /leaderboard — the sport-wide stack-rank page.
 *
 * Standalone (NOT a profile sub-tab): sport-scoped, no entity context, so it
 * renders with the pillar primitives directly (<Shell> + <NavStrip>) rather than
 * <Card> (which needs ProfileContext). Three boards behind one rail:
 *
 *   Rating    — the z-score rating board (getLeaderboard, composite scope), with
 *               a season filter (?season=, defaults to the latest rated season)
 *   Vibes     — latest sentiment 1-100 (getVibesLeaderboard)
 *   Transfers — hottest Gemma-vetted rumors by heat (getTransfersLeaderboard)
 *
 * News was removed 2026-06-07 (raw mention counts, not Gemma-audited like
 * transfers — noisy results).
 *
 * All state lives on the URL (?sport, ?board, ?type, ?season) so a board is shareable and
 * survives reload — read reactively via useSearchParams so a single dispatch
 * createAsync re-fetches only the active board on any change. Sport comes from
 * the home selector (?sport=), falling back to the $currentSport store.
 */

import { createMemo, createSignal, createEffect, on, Show, For, onMount } from "solid-js";
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
  getTransfersLeaderboard,
  type BoardEntry,
  type TransferLeader,
  type LeaderboardEntry,
} from "../lib/data/leaderboard.server";
import { tierColor } from "../lib/utils/tier-color";
import { transferStageLabel, transferStageColor } from "../lib/utils/transfer-stage";
import { transferNoun } from "../lib/cards/card-meta";
import NavStrip from "../components/solid/NavStrip";
import ScopeStrip from "../components/solid/ScopeStrip";
import Select from "../components/solid/Select";
import SearchControl from "../components/solid/SearchControl";
import Shell from "../components/solid/Shell";
import Skeleton from "../components/solid/Skeleton";
import GutterAds from "../components/solid/GutterAds";
import "./leaderboard.css";

type BoardId = "composite" | "vibes" | "transfers";

const BOARD_ITEMS: ReadonlyArray<{ id: BoardId; label: string }> = [
  { id: "composite", label: "Rating" },
  { id: "vibes", label: "Vibes" },
  { id: "transfers", label: "Transfers" },
];

const TYPE_OPTIONS = [
  { value: "player" as const, label: "Players" },
  { value: "team" as const, label: "Teams" },
];

const SPORT_DISPLAY: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.idLower, s.display]),
);

const BOARD_BLURB: Record<BoardId, string> = {
  composite: "Positionless z-score rating",
  vibes: "Highest sentiment, last 48h",
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
  }>();
  const storeSport = useStore($currentSport);

  const sport = () => (params.sport ?? storeSport() ?? "nba").toLowerCase();
  const board = (): BoardId => {
    const b = params.board;
    return b === "vibes" || b === "transfers" ? b : "composite";
  };
  const entityType = (): "player" | "team" => (params.type === "team" ? "team" : "player");
  const showTypeToggle = () => board() !== "transfers"; // transfers are always pairs
  // Season filter — Rating board only. Null ⇒ the backend's latest rated season.
  const seasonParam = (): number | null => {
    const n = Number(params.season);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // Tap-to-expand Gemma blurbs on the transfers board (keyed by rank).
  const [openBlurbs, setOpenBlurbs] = createSignal<ReadonlySet<number>>(new Set<number>());
  const isBlurbOpen = (rank: number) => openBlurbs().has(rank);
  const toggleBlurb = (rank: number) =>
    setOpenBlurbs((prev) => {
      const next = new Set(prev);
      next.has(rank) ? next.delete(rank) : next.add(rank);
      return next;
    });

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
    if (b === "transfers") {
      const r = await getTransfersLeaderboard(s, LIMIT);
      return { kind: "transfers" as const, rows: r?.rumors ?? [] };
    }
    const r = await getLeaderboard(s, et, "composite", seasonParam(), LIMIT);
    return {
      kind: "composite" as const,
      rows: r?.leaders ?? [],
      seasons: r?.available_seasons ?? [],
      season: r?.season ?? null,
    };
  });

  // Collapse any expanded blurbs when the board/sport/type switches (the ranks
  // would otherwise point at different rumors).
  createEffect(on(data, () => setOpenBlurbs(new Set<number>()), { defer: true }));

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
        metric: r.rating_composite_rank.toFixed(1),
        metricColor: tierColor(r.rating_composite_rank),
        metricLabel: "Rating",
      }));
    }
    // vibes board (BoardEntry): latest sentiment, tier-colored.
    return (d.rows as BoardEntry[]).map((r) => ({
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
    return d && d.kind === "composite" ? d.seasons : [];
  };
  const seasonOptions = () => ratingSeasons().map((s) => ({ value: String(s), label: String(s) }));
  const selectedSeason = (): number | null => {
    const d = data();
    return seasonParam() ?? (d && d.kind === "composite" ? d.season : null);
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
        <button type="button" class="lb-share" aria-label="Share this leaderboard" onClick={shareBoard}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor"
               stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 6.5 V4 H4 v10 h9 v-2.5" />
            <path d="M9 7 L15 1" />
            <path d="M11 1 H15 V5" />
          </svg>
          Share
        </button>
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
        <Show when={board() === "composite" && ratingSeasons().length > 1}>
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
                  <li class="lb-row" classList={{ "lb-row-expandable": !!r.blurb }}>
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
                    {/* Chevron sits just left of the metric (mirrors the TransfersCard
                        row) rather than dangling in a column past it. */}
                    <Show when={r.blurb}>
                      <button
                        type="button"
                        class="lb-row-blurb-toggle"
                        classList={{ open: isBlurbOpen(r.rank) }}
                        aria-expanded={isBlurbOpen(r.rank)}
                        aria-label={isBlurbOpen(r.rank) ? "Collapse summary" : "Expand summary"}
                        onClick={() => toggleBlurb(r.rank)}
                      >
                        <span class="lb-chevron" aria-hidden="true">⌄</span>
                      </button>
                    </Show>
                    <span class="lb-metric-cell">
                      <span class="lb-metric" style={r.metricColor ? { color: r.metricColor } : undefined}>
                        {r.metric}
                      </span>
                      <span class="lb-metric-label">{r.metricLabel}</span>
                    </span>
                    <Show when={r.blurb && isBlurbOpen(r.rank)}>
                      <p class="lb-row-blurb">{r.blurb}</p>
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
