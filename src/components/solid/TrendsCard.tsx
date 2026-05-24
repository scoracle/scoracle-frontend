/**
 * TrendsCard — Rating + Vibes sparklines for the active entity.
 *
 * Reads the /trends endpoint (see scoracle-backend/ENDPOINTS.md §Trends).
 *
 * Layout: one locked Shell with two sections stacked vertically,
 * separated by a horizontal hairline:
 *
 *   Rating  — season composite (headline) + full-season per-event sparkline
 *   Vibes   — latest sentiment (headline) + daily-averaged season sparkline
 *
 * The earlier Stats / Record / Mentions sections were intentionally
 * disconnected on 2026-05-24 (commit context in
 * docs/progress/2026-05-24_trends-rating-vibes-focus.md). The trends
 * payload still carries entity_recent_avgs / entity_season_avgs /
 * peer_season_avgs (and team /results / news / twitter / entities are
 * still wired for the other tabs) — reviving any of those sections is
 * a paste-back from git history. The motivation for the trim was
 * giving the two sparklines the visual stage they earned without
 * paying the rendering + (in Record's case) fetch cost of three extra
 * sections users had told us read as background noise next to the
 * sparklines.
 *
 * Tier color (the 5-step antique-tarot palette) drives both
 * sparklines so a `73` on either surface reads the same green-blue.
 *
 * Empty branches: each section gates on its own data
 * (`entity_season_score_avg == null` → no Rating;
 *  empty `entity_season_vibe_series` → no Vibes). Both empty → render
 * the shared <EmptyCard/>.
 */

import { createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getTrends } from "../../lib/data/trends.server";
import { tierColor } from "../../lib/utils/tier-color";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./TrendsCard.css";

/** Compact month+day for sparkline axis labels. Year is implicit
 *  from context (current season); using UTC keeps SSR + client in
 *  agreement on the day. */
const AXIS_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return AXIS_DATE_FMT.format(d);
}

export default function TrendsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const data = createAsync(() => getTrends(sport, type, id, ctx.season()));

  // Rating section — headline number + per-event sparkline. Hidden
  // when the season composite is null (per backend spec: don't try
  // to derive from per-event array when the authoritative season
  // number is null).
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

  // Vibes sparkline reads the daily-averaged season series, parallel
  // to the Rating sparkline. Hidden when the series is empty.
  const showVibes = createMemo(
    () => (data()?.entity_season_vibe_series?.length ?? 0) > 0,
  );

  const isEmpty = createMemo(() => {
    const d = data();
    if (!d) return true;
    return !showScore() && !showVibes();
  });

  return (
    <Show when={data()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty()} fallback={<EmptyCard />}>
          <Shell as="article" class="trends-card-shell" aria-label="Trends">
            <div class="trends-card">
              <Show when={showScore()}>
                {(_s) => {
                  // Full-season Rating sparkline. X positions follow
                  // start_time across the played-events range (oldest
                  // left → newest right) so a tight cluster of
                  // back-to-backs reads visually tight and the all-
                  // star break reads as a gap.
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
                  // Group consecutive non-null events into polyline runs
                  // — one <polyline> per run keeps DNP gaps honest while
                  // keeping the DOM tight at season-length counts.
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
                  const startLabel = formatAxisDate(events[0].start_time);
                  const endLabel = formatAxisDate(events[events.length - 1].start_time);
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

              <Show when={showScore() && showVibes()}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showVibes()}>
                {(_v) => {
                  // Daily-averaged season vibe series. Same geometry +
                  // visual language as the Rating sparkline so the two
                  // sections read as siblings. Backend already drops
                  // zero-snapshot days so quiet stretches render as
                  // honest gaps.
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
                  const startLabel = formatAxisDate(series[0].date);
                  const endLabel = formatAxisDate(series[series.length - 1].date);
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
          <Skeleton shape="line" width={120} height={36} />
          <Skeleton shape="line" width={280} height={60} />
        </section>
        <div class="trends-divider" aria-hidden="true" />
        <section class="trends-section">
          <Skeleton shape="line" width={160} height={12} />
          <Skeleton shape="line" width={120} height={36} />
          <Skeleton shape="line" width={280} height={60} />
        </section>
      </div>
    </Shell>
  );
}
