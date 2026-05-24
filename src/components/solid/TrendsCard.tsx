/**
 * TrendsCard — combined statistical + narrative recency for the active entity.
 *
 * Reads the /trends endpoint (see scoracle-backend/ENDPOINTS.md §Trends),
 * plus the team /results endpoint (Record section, team entities only)
 * and the cached news / twitter / entities queries (Mentions section).
 *
 * Sections stack vertically inside one locked Shell, separated by
 * horizontal hairlines:
 *
 *   Rating  — season composite (headline) + per-event sparkline
 *   Vibes   — latest sentiment (headline) + time-positioned 7-day sparkline
 *   Stats   — top 5 per-stat mover rows, Self / League dual delta
 *   Record  — last 5 finalized games (W/L/D + score + composite), team only
 *   Mentions — last 48h co-mention top 5
 *
 * Tier color (the 5-step antique-tarot palette) carries direction +
 * magnitude across every surface so a `73` on Vibes, Score, or a stat
 * percentile all read the same green-blue.
 *
 * Empty branches: each section gates on its own data (no scored events
 * → no Score; no snapshots → no Vibes; etc.). When EVERY section is
 * empty, the Card falls through to <EmptyCard/>.
 */

import { createMemo, Show, For } from "solid-js";
import { A, createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getTrends,
  type TrendsResponse,
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
  /** The entity's own season average for this stat (per-game, comparable
   *  to `recent`). Null when the trends payload didn't include a self
   *  baseline — e.g. player entities, where the backend omits the field
   *  entirely; the row then renders without a self-delta column. */
  selfBaseline: number | null;
  selfDelta: number | null;
  peer: number;
  peerDelta: number;
  inverted: boolean;
  /** Magnitude used for sorting — max of the two |deltas| so a row
   *  that's flat-vs-peer but huge-vs-self still surfaces. */
  sortMagnitude: number;
}

const MAX_STAT_ROWS = 5;
const MAX_RECORD_ROWS = 5;
const MAX_MENTION_ROWS = 5;
const MENTION_WINDOW_MS = 48 * 60 * 60 * 1000;


function buildStatRows(data: TrendsResponse): StatRow[] {
  const recents = data.entity_recent_avgs;
  const selves = data.entity_season_avgs ?? {};
  const peers = data.peer_season_avgs;
  const rows: StatRow[] = [];
  for (const key of Object.keys(peers)) {
    const peer = peers[key];
    const recent = recents[key];
    if (recent == null || peer == null || peer === 0) continue;
    const peerDelta = (recent - peer) / peer;
    const selfRaw = selves[key];
    const selfBaseline = selfRaw != null && selfRaw !== 0 ? selfRaw : null;
    const selfDelta = selfBaseline != null ? (recent - selfBaseline) / selfBaseline : null;
    // Sort priority: surface a row if EITHER delta is interesting, so
    // a "+5% vs peers but -67% vs self" stat doesn't get buried under
    // a fifth dominance row.
    const sortMagnitude = Math.max(
      Math.abs(peerDelta),
      selfDelta != null ? Math.abs(selfDelta) : 0,
    );
    rows.push({
      key,
      label: getStatLabel(key),
      recent,
      selfBaseline,
      selfDelta,
      peer,
      peerDelta,
      inverted: LOWER_IS_BETTER.has(key),
      sortMagnitude,
    });
  }
  rows.sort((a, b) => b.sortMagnitude - a.sortMagnitude);
  const top = rows.slice(0, MAX_STAT_ROWS);
  // Within the top set, sort by signed self-delta when available
  // (otherwise peer-delta) so positive movers appear at the top —
  // the "what's hot" reading order.
  top.sort((a, b) => {
    const aDelta = a.selfDelta ?? a.peerDelta;
    const bDelta = b.selfDelta ?? b.peerDelta;
    const da = a.inverted ? -aDelta : aDelta;
    const db = b.inverted ? -bDelta : bDelta;
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

  // Vibes sparkline now reads the daily-averaged season series rather
  // than the rolling 7-day raw snapshots — same time-positioned shape
  // as the Rating sparkline, parallel reading. Hidden when the series
  // is empty (mirrors the Rating "no scored events → hide" pattern).
  const showVibes = createMemo(
    () => (data()?.entity_season_vibe_series?.length ?? 0) > 0,
  );

  // Score section — headline number + per-event sparkline. Hidden when
  // the season composite is null (per backend spec: "If
  // entity_season_score_avg is null, render the whole block as a 'not
  // enough data' empty state. Don't try to derive from recents.").
  const showScore = createMemo(() => data()?.entity_season_score_avg != null);

  // Backend ships entity_event_scores newest first; sort
  // chronologically here so the sparkline's X axis maps cleanly to
  // start_time left-to-right.
  const eventScoresChronological = createMemo(() => {
    const d = data();
    if (!d) return [];
    return [...d.entity_event_scores].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  });

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
    return (
      !showScore() &&
      statRows().length === 0 &&
      !showVibes() &&
      !showRecord() &&
      !showMentions()
    );
  });

  const statsRange = createMemo(() => {
    const d = data();
    if (!d) return "Last 3 Games";
    return d.window.spans_prior_season
      ? "Last 3 Games (spans prior season)"
      : "Last 3 Games";
  });

  // Backend omits entity_season_avgs entirely for some payloads
  // (e.g. player entities, per the integration spec). The self-delta
  // column hides whenever the field is missing or empty so we don't
  // render a column header with no data underneath.
  const showSelfColumn = createMemo(() => {
    const d = data();
    if (!d) return false;
    const self = d.entity_season_avgs;
    return self != null && Object.keys(self).length > 0;
  });

  return (
    <Show when={data()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty()} fallback={<EmptyCard />}>
          <Shell as="article" class="trends-card-shell" aria-label="Trends">
            <div class="trends-card">
              <Show when={showScore()}>
                {(_s) => {
                  // Full-season sparkline. X positions follow start_time
                  // across the played-events range (oldest → newest left
                  // to right) so a tight cluster of back-to-backs reads
                  // visually tight and the all-star break reads as a gap.
                  // Y maps composite 0 → 100 onto the plot band with 8px
                  // padding so the peer reference line + dot strokes
                  // never clip. Per-dot axis labels were dropped when
                  // the window expanded past 3 events — at ~80 dots the
                  // sparkline is the whole story; per-event detail is a
                  // future hover-tooltip task.
                  const W = 280;
                  const H = 60;
                  const PAD_X = 6;
                  const PAD_Y = 8;
                  const plotW = W - PAD_X * 2;
                  const plotH = H - PAD_Y * 2;
                  const yFor = (v: number) =>
                    PAD_Y + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
                  const events = eventScoresChronological();
                  const startMs = new Date(events[0].start_time).getTime();
                  const endMs = new Date(events[events.length - 1].start_time).getTime();
                  const spanMs = Math.max(endMs - startMs, 1);
                  const xFor = (iso: string) => {
                    if (events.length <= 1) return W / 2;
                    const t = new Date(iso).getTime();
                    return PAD_X + ((t - startMs) / spanMs) * plotW;
                  };
                  const headline = data()!.entity_season_score_avg!;
                  const peer = data()!.peer_season_score_avg;
                  // Group consecutive non-null events into polyline
                  // runs — one <polyline> per run keeps DNP gaps honest
                  // (no fabricated straight line across missing data)
                  // while keeping the DOM tight at season-length counts.
                  const runs: string[] = [];
                  let current: string[] = [];
                  for (const e of events) {
                    if (e.composite_score == null) {
                      if (current.length > 1) runs.push(current.join(" "));
                      current = [];
                    } else {
                      current.push(`${xFor(e.start_time)},${yFor(e.composite_score)}`);
                    }
                  }
                  if (current.length > 1) runs.push(current.join(" "));
                  const startLabel = formatRecordDate(events[0].start_time);
                  const endLabel = formatRecordDate(events[events.length - 1].start_time);
                  return (
                    <section class="trends-section trends-section-score" aria-label="Composite rating">
                      <h3 class="trends-section-label">
                        <span class="trends-section-type">Rating</span>
                        <span class="trends-section-range"> · Season</span>
                      </h3>
                      <div
                        class="trends-score-headline"
                        style={{ color: tierColor(headline) }}
                        aria-label={`Season rating ${Math.round(headline)}`}
                      >
                        {Math.round(headline)}
                      </div>
                      <div class="trends-score-sparkline-wrap">
                        <svg
                          class="trends-score-sparkline"
                          viewBox={`0 0 ${W} ${H}`}
                          width={W}
                          height={H}
                          aria-hidden="true"
                        >
                          <line
                            class="trends-score-peer-line"
                            x1={0}
                            x2={W}
                            y1={yFor(peer)}
                            y2={yFor(peer)}
                          />
                          <For each={runs}>
                            {(points) => (
                              <polyline
                                class="trends-score-segment"
                                fill="none"
                                points={points}
                              />
                            )}
                          </For>
                          <For each={events}>
                            {(row) => (
                              <Show when={row.composite_score != null}>
                                <circle
                                  class="trends-score-dot"
                                  cx={xFor(row.start_time)}
                                  cy={yFor(row.composite_score!)}
                                  r={2.25}
                                  fill={tierColor(row.composite_score!)}
                                />
                              </Show>
                            )}
                          </For>
                        </svg>
                        <div class="trends-score-axis">
                          <span>{startLabel}</span>
                          <span class="trends-score-peer-caption">
                            peer ~{Math.round(peer)}
                          </span>
                          <span>{endLabel}</span>
                        </div>
                      </div>
                    </section>
                  );
                }}
              </Show>

              <Show when={showScore() && (showVibes() || statRows().length > 0 || showRecord() || showMentions())}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showVibes()}>
                {(_v) => {
                  // Daily-averaged season vibe series. Same geometry +
                  // visual language as the Rating sparkline so the two
                  // sections read as siblings — different content, same
                  // grammar. Backend already drops zero-snapshot days
                  // server-side; the polyline runs through every row
                  // we receive.
                  const W = 280;
                  const H = 60;
                  const PAD_X = 6;
                  const PAD_Y = 8;
                  const plotW = W - PAD_X * 2;
                  const plotH = H - PAD_Y * 2;
                  const yFor = (v: number) =>
                    PAD_Y + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
                  const VIBE_NEUTRAL = 50;
                  const series = data()!.entity_season_vibe_series;
                  const snaps = data()!.vibes.snapshots;
                  const startMs = new Date(series[0].date).getTime();
                  const endMs = new Date(series[series.length - 1].date).getTime();
                  const spanMs = Math.max(endMs - startMs, 1);
                  const xFor = (date: string) => {
                    if (series.length <= 1) return W / 2;
                    const t = new Date(date).getTime();
                    return PAD_X + ((t - startMs) / spanMs) * plotW;
                  };
                  // Prefer the freshest raw snapshot for the headline
                  // (most responsive to brand-new sentiment); fall back
                  // to the latest series row when the 7-day window is
                  // empty but the season series has earlier data.
                  const headline = snaps[0]?.sentiment ?? series[series.length - 1].sentiment_avg;
                  const polyline = series
                    .map((r) => `${xFor(r.date)},${yFor(r.sentiment_avg)}`)
                    .join(" ");
                  const startLabel = formatRecordDate(series[0].date);
                  const endLabel = formatRecordDate(series[series.length - 1].date);
                  return (
                    <section class="trends-section trends-section-vibes" aria-label="Vibe trend">
                      <h3 class="trends-section-label">
                        <span class="trends-section-type">Vibes</span>
                        <span class="trends-section-range"> · Season</span>
                      </h3>
                      <div
                        class="trends-vibe-headline"
                        style={{ color: tierColor(headline) }}
                        aria-label={`Latest vibe ${headline}`}
                      >
                        {headline}
                      </div>
                      <div class="trends-vibe-sparkline-wrap">
                        <svg
                          class="trends-vibe-sparkline"
                          viewBox={`0 0 ${W} ${H}`}
                          width={W}
                          height={H}
                          aria-hidden="true"
                        >
                          <line
                            class="trends-vibe-neutral-line"
                            x1={0}
                            x2={W}
                            y1={yFor(VIBE_NEUTRAL)}
                            y2={yFor(VIBE_NEUTRAL)}
                          />
                          <Show when={series.length > 1}>
                            <polyline
                              class="trends-vibe-segment"
                              fill="none"
                              points={polyline}
                            />
                          </Show>
                          <For each={series}>
                            {(row) => (
                              <circle
                                class="trends-vibe-dot"
                                cx={xFor(row.date)}
                                cy={yFor(row.sentiment_avg)}
                                r={2.25}
                                fill={tierColor(row.sentiment_avg)}
                              />
                            )}
                          </For>
                        </svg>
                        <div class="trends-vibe-axis">
                          <span>{startLabel}</span>
                          <span>{endLabel}</span>
                        </div>
                      </div>
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
                  <ul class="trends-rows" classList={{ "trends-stat-rows-dual": showSelfColumn() }}>
                    <Show when={showSelfColumn()}>
                      <li class="trends-row trends-stat-header" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span class="trends-stat-col-label">Self</span>
                        <span class="trends-stat-col-label">League</span>
                      </li>
                    </Show>
                    <For each={statRows()}>
                      {(row) => {
                        const selfColor = row.selfDelta != null
                          ? tierColorFromDelta(row.selfDelta, row.inverted)
                          : undefined;
                        const peerColor = tierColorFromDelta(row.peerDelta, row.inverted);
                        // Recent value takes the self-delta tint when we
                        // have one (it's the headline trend signal); peer
                        // is the fallback for player rows / missing keys.
                        const recentColor = selfColor ?? peerColor;
                        const selfArrow = row.selfDelta != null
                          ? trendArrow(row.selfDelta, row.inverted)
                          : "";
                        const peerArrow = trendArrow(row.peerDelta, row.inverted);
                        return (
                          <li class="trends-row trends-stat-row">
                            <span class="trends-stat-key">{row.label}</span>
                            <span class="trends-stat-value" style={{ color: recentColor }}>
                              {formatStatValue(row.recent)}
                            </span>
                            <span class="trends-stat-peer">
                              vs {formatStatValue(row.peer)}
                            </span>
                            <Show when={showSelfColumn()}>
                              <span class="trends-stat-delta" style={{ color: selfColor }}>
                                <Show when={selfArrow}>
                                  <span class="trends-stat-arrow" aria-hidden="true">{selfArrow}</span>
                                </Show>
                                {row.selfDelta != null ? formatDeltaPct(row.selfDelta) : "—"}
                              </span>
                            </Show>
                            <span class="trends-stat-delta" style={{ color: peerColor }}>
                              <Show when={peerArrow}>
                                <span class="trends-stat-arrow" aria-hidden="true">{peerArrow}</span>
                              </Show>
                              {formatDeltaPct(row.peerDelta)}
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
                              <span class="trends-record-composite">
                                <Show
                                  when={g.composite_score != null}
                                  fallback={<span aria-hidden="true">·</span>}
                                >
                                  <span
                                    class="trends-record-composite-value"
                                    style={{ color: tierColor(g.composite_score!) }}
                                    aria-label={`Composite ${Math.round(g.composite_score!)}`}
                                  >
                                    {Math.round(g.composite_score!)}
                                  </span>
                                </Show>
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
