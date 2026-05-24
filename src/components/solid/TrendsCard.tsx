/**
 * TrendsCard — combined statistical + narrative recency for the active entity.
 *
 * Reads the /trends endpoint (see scoracle-backend/ENDPOINTS.md §Trends).
 * Layout: one locked Shell with two sections stacked vertically — vibes
 * on top, stats below, separated by a horizontal hairline.
 *
 *   ┌─────────────────────────────────────┐
 *   │ VIBES · LAST 7 DAYS                 │
 *   │ today    89                         │
 *   │ 1d ago   81                         │
 *   │ …                                   │
 *   ├─────────────────────────────────────┤
 *   │ STATS · LAST 3 GAMES                │
 *   │ KR TDs       0.33    vs 0.16        │
 *   │ Turnovers    0.00    vs 0.05        │
 *   │ …                                   │
 *   └─────────────────────────────────────┘
 *
 * The recent stat value is tier-colored against the 5-step antique-tarot
 * palette via `tierColorFromDelta` (positive direction = green/blue,
 * negative = red/orange). The peer baseline is the same number cohort
 * peers averaged over their season — concrete context the user can
 * compare against. **No percentage delta is shown**: percent change off
 * tiny baselines (a `+107%` jump from 0.16 → 0.33) reads as noise, and
 * `−100%` off a zero recent value is mathematically undefined. Tier
 * color + raw values do the same job without the misleading number.
 *
 * Vibe scores use the same 5-step palette via `tierColor` so a "73" on
 * either surface reads the same green-blue.
 *
 * Empty branches:
 *   - games_used: 0  OR peer_cohort_size < 5 → hide stats section
 *   - vibes.snapshots: []                    → hide vibes section
 *   - both empty                             → render <EmptyCard/>
 */

import { createMemo, Show, For } from "solid-js";
import { A, createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getTrends,
  type TrendsResponse,
  type TrendsVibeSnapshot,
} from "../../lib/data/trends.server";
import {
  getTeamResults,
  type TeamResultGame,
} from "../../lib/data/team-results.server";
import { getNews } from "../../lib/data/news.server";
import { getTwitterFeed, type Tweet } from "../../lib/data/twitter.server";
import { getEntities } from "../../lib/data/entities";
import {
  findCoMentions,
  type Article,
  type CoMention,
} from "../../lib/utils/co-mentions";
import {
  tierColor,
  tierColorFromDelta,
  LOWER_IS_BETTER,
} from "../../lib/utils/tier-color";
import { getStatLabel } from "../../lib/utils/stats-categorizer";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./TrendsCard.css";

interface StatRow {
  key: string;
  label: string;
  recent: number;
  peer: number;
  delta: number;
  inverted: boolean;
}

const MAX_STAT_ROWS = 5;
const MAX_RECORD_ROWS = 5;
const MAX_VIBE_ROWS = 5;
const MAX_MENTION_ROWS = 5;
const MENTION_WINDOW_MS = 48 * 60 * 60 * 1000;

function buildStatRows(data: TrendsResponse): StatRow[] {
  const recents = data.entity_recent_avgs;
  const peers = data.peer_season_avgs;
  const rows: StatRow[] = [];
  for (const key of Object.keys(peers)) {
    const peer = peers[key];
    const recent = recents[key];
    if (recent == null || peer == null || peer === 0) continue;
    const delta = (recent - peer) / peer;
    rows.push({
      key,
      label: getStatLabel(key),
      recent,
      peer,
      delta,
      inverted: LOWER_IS_BETTER.has(key),
    });
  }
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = rows.slice(0, MAX_STAT_ROWS);
  // Within the top set, sort by signed delta descending so positive
  // movers appear at the top — the "what's hot" reading order.
  top.sort((a, b) => {
    const da = a.inverted ? -a.delta : a.delta;
    const db = b.inverted ? -b.delta : b.delta;
    return db - da;
  });
  return top;
}

function formatStatValue(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/** Render delta as a signed percentage. Sub-0.5% deltas read as flat. */
function formatDeltaPct(delta: number): string {
  const pct = delta * 100;
  if (Math.abs(pct) < 0.5) return "0%";
  const rounded = Math.round(pct);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/** Direction glyph: ▲ for "good direction" trend, ▼ for "bad direction",
 *  empty string when the move is too small to call. The good direction
 *  is positive for normal stats and negative for `inverted` ones
 *  (turnovers, fouls — lower = better). Backed by the existing
 *  `LOWER_IS_BETTER` set so the arrow always reinforces the tier color. */
function trendArrow(delta: number, inverted: boolean): string {
  if (Math.abs(delta) < 0.005) return "";
  const goodDirection = inverted ? delta < 0 : delta > 0;
  return goodDirection ? "▲" : "▼";
}

/** UTC-day index of an ISO timestamp. Used for day-difference labeling so
 *  SSR and client agree regardless of viewer timezone. */
function utcDay(iso: string): number {
  const d = new Date(iso);
  return Math.floor(d.getTime() / 86_400_000);
}

function dayLabel(snapshot: TrendsVibeSnapshot, anchorIso: string, index: number): string {
  if (index === 0) return "today";
  const diff = utcDay(anchorIso) - utcDay(snapshot.generated_at);
  if (diff <= 0) return "today";
  if (diff === 1) return "1d ago";
  return `${diff}d ago`;
}

interface RecordSummary {
  wins: number;
  losses: number;
  draws: number;
  season: number;
  games: TeamResultGame[];
}

/** Compact month+day for record rows. Year sits in the section header,
 *  so each row only needs "Apr 12" / "Oct 4". UTC to match start_time's
 *  storage convention and keep SSR/client output identical. */
const RECORD_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatRecordDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return RECORD_DATE_FMT.format(d);
}

/** Lift a tweet into the shape `findCoMentions` wants — same adapter the
 *  retired CoMentionsCard used, lifted verbatim. */
function tweetToArticle(tweet: Tweet): Article & { kind: "tweet" } {
  return {
    kind: "tweet",
    title: tweet.text,
    url: `https://twitter.com/${tweet.author_username}/status/${tweet.id}`,
    published_at: tweet.created_at,
    source: `@${tweet.author_username}`,
  };
}

function articleAgeMs(a: Article, now: number): number {
  const iso = a.published_at ?? a.pub_date;
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? now - t : Infinity;
}

function summarizeRecord(payload: NonNullable<Awaited<ReturnType<typeof getTeamResults>>>): RecordSummary | null {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  // Backend returns newest first; that matches the rest of TrendsCard's
  // recency ordering (Vibes: today on top, Stats: last-3). Keep it.
  const games: TeamResultGame[] = [];
  for (const g of payload.results) {
    if (g.result == null) continue;
    games.push(g);
    if (g.result === "W") wins++;
    else if (g.result === "L") losses++;
    else if (g.result === "D") draws++;
  }
  if (games.length === 0) return null;
  return { wins, losses, draws, season: payload.meta.season, games };
}

export default function TrendsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const data = createAsync(() => getTrends(sport, type, id, ctx.season()));
  const results = createAsync(() =>
    type === "team" ? getTeamResults(sport, id, ctx.season()) : Promise.resolve(null),
  );
  // Mentions section reuses the news + twitter caches the route already
  // warms via firePreloads, plus the sport's bundled entity directory.
  // All three resolve to null if data is missing — the section then
  // simply hides.
  const news = createAsync(() => getNews(sport, type, id));
  const twitter = createAsync(() => getTwitterFeed(sport, type, id, 20));
  const entities = createAsync(() => getEntities(sport));

  const showStats = createMemo(() => {
    const d = data();
    if (!d) return false;
    return d.window.games_used > 0 && d.peer_cohort_size >= 5;
  });

  const statRows = createMemo<StatRow[]>(() => {
    const d = data();
    if (!d || !showStats()) return [];
    return buildStatRows(d);
  });

  const showVibes = createMemo(() => (data()?.vibes.snapshots.length ?? 0) > 0);

  const recordSummary = createMemo<RecordSummary | null>(() => {
    if (type !== "team") return null;
    const r = results();
    if (!r) return null;
    return summarizeRecord(r);
  });

  const showRecord = createMemo(() => recordSummary() !== null);

  const mentions = createMemo<CoMention[]>(() => {
    const e = entities();
    const n = news();
    if (!e || n === undefined) return [];
    const t = twitter();
    const tweetArticles = (t?.available && t.tweets.length ? t.tweets : []).map(tweetToArticle);
    const allArticles: Article[] = [...(n ?? []), ...tweetArticles];
    if (allArticles.length === 0) return [];
    // Keep only items published in the last 48h, matching the section
    // label. The news + twitter caches return more than that window;
    // this trim is the cheap honest path.
    const now = Date.now();
    const recent = allArticles.filter((a) => articleAgeMs(a, now) <= MENTION_WINDOW_MS);
    if (recent.length === 0) return [];
    return findCoMentions(recent, e, id, type);
  });

  const showMentions = createMemo(() => mentions().length > 0);

  const isEmpty = createMemo(() => {
    const d = data();
    if (!d) return true;
    return statRows().length === 0 && !showVibes() && !showRecord() && !showMentions();
  });

  const statsRange = createMemo(() => {
    const d = data();
    if (!d) return "Last 3 Games";
    return d.window.spans_prior_season
      ? "Last 3 Games (spans prior season)"
      : "Last 3 Games";
  });

  return (
    <Show when={data()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty()} fallback={<EmptyCard />}>
          <Shell as="article" class="trends-card-shell" aria-label="Trends">
            <div class="trends-card">
              <Show when={showVibes()}>
                {(_v) => {
                  // Backend pulls up to 7 days of snapshots; the page only
                  // shows the most recent few to stay glanceable. Anchor the
                  // day-diff against the newest displayed snapshot.
                  const displayedSnaps = data()!.vibes.snapshots.slice(0, MAX_VIBE_ROWS);
                  return (
                    <section class="trends-section trends-section-vibes" aria-label="Vibe trend">
                      <h3 class="trends-section-label">
                        <span class="trends-section-type">Vibes</span>
                        <span class="trends-section-range"> · Last 7 Days</span>
                      </h3>
                      <ul class="trends-rows">
                        <For each={displayedSnaps}>
                          {(snap, i) => (
                            <li class="trends-row trends-vibe-row">
                              <span class="trends-vibe-day">
                                {dayLabel(snap, displayedSnaps[0].generated_at, i())}
                              </span>
                              <span
                                class="trends-vibe-score"
                                style={{ color: tierColor(snap.sentiment) }}
                              >
                                {snap.sentiment}
                              </span>
                            </li>
                          )}
                        </For>
                      </ul>
                    </section>
                  );
                }}
              </Show>

              <Show when={showStats() && statRows().length > 0 && showVibes()}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showStats() && statRows().length > 0}>
                <section class="trends-section trends-section-stats" aria-label="Stat trend">
                  <h3 class="trends-section-label">
                    <span class="trends-section-type">Stats</span>
                    <span class="trends-section-range"> · {statsRange()}</span>
                  </h3>
                  <ul class="trends-rows">
                    <For each={statRows()}>
                      {(row) => {
                        const color = tierColorFromDelta(row.delta, row.inverted);
                        const arrow = trendArrow(row.delta, row.inverted);
                        return (
                          <li class="trends-row trends-stat-row">
                            <span class="trends-stat-key">{row.label}</span>
                            <span class="trends-stat-value" style={{ color }}>
                              {formatStatValue(row.recent)}
                            </span>
                            <span class="trends-stat-peer">
                              vs {formatStatValue(row.peer)}
                            </span>
                            <span class="trends-stat-delta" style={{ color }}>
                              <Show when={arrow}>
                                <span class="trends-stat-arrow" aria-hidden="true">{arrow}</span>
                              </Show>
                              {formatDeltaPct(row.delta)}
                            </span>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </section>
              </Show>

              <Show when={showRecord() && (showVibes() || (showStats() && statRows().length > 0))}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showRecord()}>
                {(_g) => {
                  const summary = recordSummary()!;
                  const recordLabel = summary.draws > 0
                    ? `${summary.wins}–${summary.losses}–${summary.draws}`
                    : `${summary.wins}–${summary.losses}`;
                  // W/L/D tally reflects the full season; the displayed
                  // list is capped to the most recent few so the Card
                  // stays a recency-shaped surface (sibling to Vibes:
                  // last 7 days, Stats: last 3 games).
                  const displayedGames = summary.games.slice(0, MAX_RECORD_ROWS);
                  return (
                    <section class="trends-section trends-section-record" aria-label="Season record">
                      <h3 class="trends-section-label">
                        <span class="trends-section-type">Record</span>
                        <span class="trends-section-range">
                          {" · "}{summary.season} · {recordLabel}
                        </span>
                      </h3>
                      <ul class="trends-rows trends-record-rows">
                        <For each={displayedGames}>
                          {(g) => (
                            <li
                              class="trends-row trends-record-row"
                              data-outcome={g.result!}
                            >
                              <span class="trends-record-outcome">{g.result}</span>
                              <span class="trends-record-date">
                                {formatRecordDate(g.start_time)}
                              </span>
                              <span class="trends-record-score">
                                {g.team_score}
                                <span class="trends-record-sep">–</span>
                                {g.opponent_score}
                              </span>
                              <span class="trends-record-locus">
                                {g.home_away === "home" ? "vs" : "@"}
                                {g.opponent.short_code
                                  ? ` ${g.opponent.short_code}`
                                  : ""}
                              </span>
                            </li>
                          )}
                        </For>
                      </ul>
                    </section>
                  );
                }}
              </Show>

              <Show when={showMentions() && (showVibes() || (showStats() && statRows().length > 0) || showRecord())}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showMentions()}>
                <section class="trends-section trends-section-mentions" aria-label="Co-mentioned entities">
                  <h3 class="trends-section-label">
                    <span class="trends-section-type">Mentions</span>
                    <span class="trends-section-range"> · Last 48 Hours</span>
                  </h3>
                  <ul class="trends-rows">
                    <For each={mentions().slice(0, MAX_MENTION_ROWS)}>
                      {(m) => {
                        const href = `/profile?sport=${sport.toUpperCase()}&type=${m.entity.type}&id=${m.entity.id}`;
                        return (
                          <li class="trends-row trends-mention-row">
                            <A href={href} class="trends-mention-name">
                              {m.entity.name}
                            </A>
                            <span class="trends-mention-count">{m.mentionCount}</span>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </section>
              </Show>
            </div>
          </Shell>
        </Show>
      )}
    </Show>
  );
}

export function TrendsCardSkeleton() {
  return (
    <Shell as="article" class="trends-card-shell" aria-label="Trends">
      <div class="trends-card">
        <section class="trends-section">
          <Skeleton shape="line" width={160} height={12} />
          <div class="card-loading">
            <For each={[1, 2, 3, 4]}>
              {() => <Skeleton shape="line" width="100%" height={18} />}
            </For>
          </div>
        </section>
        <div class="trends-divider" aria-hidden="true" />
        <section class="trends-section">
          <Skeleton shape="line" width={160} height={12} />
          <div class="card-loading">
            <For each={[1, 2, 3, 4, 5]}>
              {() => <Skeleton shape="line" width="100%" height={18} />}
            </For>
          </div>
        </section>
      </div>
    </Shell>
  );
}
