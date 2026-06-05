/**
 * TrendsCard — the entity's season Trends: two sparklines on one shared 0-100
 * axis, so on-court rating and public sentiment read against each other:
 *
 *   Composite (blue, --compare-primary)  — rating_composite_pct per event  [/sparkline]
 *   Vibes     (red,  --category-scoring)  — sentiment_avg         per day    [/trends]
 *
 * The Composite 0-100 value is the positionless per-event percentile (backend
 * migration 029); the vibe value is the daily-averaged sentiment. X is a true
 * time axis (oldest left → newest right), shared by both series, so a per-game
 * rating dot and a per-day vibe dot line up by date.
 *
 * Headline: the season composite percentile (rating.rating_composite_rank, 0-100,
 * tier-colored). A faint dashed midline marks the 50th percentile. When the entity
 * has no rated season the card degrades to a vibe-only line with a vibe headline.
 *
 * Data: two islands — getSparkline (composite line) + getTrends (vibe line) —
 * both warmed by the trends tab's preload. Empty only when neither exists.
 */

import { createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getTrends } from "../../lib/data/trends.server";
import { getSparkline } from "../../lib/data/sparkline.server";
import { tierColor } from "../../lib/utils/tier-color";
import { pillarLabel } from "../../lib/cards/card-meta";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./TrendsCard.css";

/** Compact month+day for the sparkline's date axis. UTC keeps SSR + client
 *  in agreement on which day a timestamp falls on. */
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

interface Pt {
  cx: number;
  cy: number;
}
interface Series {
  line: string;
  dots: Pt[];
}

export default function TrendsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // Client-facing pillar labels (General/Rating · Special · Vibe) — reactive.
  const compositeLabel = () => pillarLabel("composite", type()) ?? "Composite";
  const vibeLabel = () => pillarLabel("vibes", type()) ?? "Vibe";

  // Two islands: sparkline drives the rating lines (top priority), trends the
  // vibe line. Both warm via the trends tab preload, so they're cache-warm by
  // the time the user lands here.
  const sparkline = createAsync(() => getSparkline(sport(), type(), id(), ctx.season()));
  const trends = createAsync(() => getTrends(sport(), type(), id(), ctx.season()));

  const rating = createMemo(() => sparkline()?.rating ?? null);

  // Per-event Composite (0-100), chronological. Guard each point so a stray null
  // can't break the polyline.
  const ratingEvents = createMemo(() => {
    const d = sparkline();
    if (!d) return [];
    return [...d.events]
      .filter((e) => e.rating_composite_pct != null)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
  });

  // Daily-averaged vibe series (0-100), chronological.
  const vibeSeries = createMemo(() => {
    const s = trends()?.entity_season_vibe_series ?? [];
    return [...s].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  });

  const showRating = createMemo(() => rating() != null && ratingEvents().length > 0);
  const showVibes = createMemo(() => vibeSeries().length > 0);
  const isEmpty = createMemo(() => !showRating() && !showVibes());

  // Headline: 0-100 season composite percentile when rated, else latest vibe.
  const headline = createMemo(() => {
    const r = rating();
    if (r != null) return { kind: compositeLabel(), val: Math.round(r.rating_composite_rank) };
    const vs = vibeSeries();
    return { kind: vibeLabel(), val: Math.round(vs[vs.length - 1]?.sentiment_avg ?? 0) };
  });

  // All geometry + point strings in one memo so the SVG stays declarative.
  const chart = createMemo(() => {
    const events = ratingEvents();
    const vibes = vibeSeries();
    if (!events.length && !vibes.length) return null;

    const W = 336;
    const H = 148;
    const PAD_X = 8;
    const PAD_T = 10;
    const PAD_B = 10;
    const plotW = W - PAD_X * 2;
    const plotH = H - PAD_T - PAD_B;
    const yFor = (v: number) =>
      PAD_T + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;

    // Shared time domain across every series present.
    const times: number[] = [];
    for (const e of events) times.push(new Date(e.start_time).getTime());
    for (const v of vibes) times.push(new Date(v.date).getTime());
    const startMs = Math.min(...times);
    const endMs = Math.max(...times);
    const spanMs = Math.max(endMs - startMs, 1);
    const xFor = (ms: number) =>
      times.length <= 1 ? W / 2 : PAD_X + ((ms - startMs) / spanMs) * plotW;

    const toSeries = (rows: { t: number; v: number }[]): Series => ({
      line: rows.map((r) => `${xFor(r.t)},${yFor(r.v)}`).join(" "),
      dots: rows.map((r) => ({ cx: xFor(r.t), cy: yFor(r.v) })),
    });

    return {
      W,
      H,
      midY: yFor(50),
      hasRating: events.length > 0,
      hasVibes: vibes.length > 0,
      composite: toSeries(
        events.map((e) => ({ t: new Date(e.start_time).getTime(), v: e.rating_composite_pct })),
      ),
      vibes: toSeries(
        vibes.map((v) => ({ t: new Date(v.date).getTime(), v: v.sentiment_avg })),
      ),
      startLabel: formatAxisDate(new Date(startMs).toISOString()),
      endLabel: formatAxisDate(new Date(endMs).toISOString()),
    };
  });

  return (
    <Show when={sparkline() ?? trends()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty() && chart()} fallback={<EmptyCard />}>
          {(c) => (
            <Card id="trends" as="article" class="trends-card-shell" aria-label="Trends">
              <div class="trends-card">
                <h3 class="trends-section-label">
                  <span class="trends-section-type">{headline().kind}</span>
                  <span class="trends-section-range"> · Season</span>
                </h3>
                <div
                  class="trends-headline"
                  style={{ color: tierColor(headline().val) }}
                  aria-label={`Season ${rating() != null ? "rating" : "vibe"} ${headline().val}`}
                >
                  {headline().val}
                </div>
                <div class="trends-sparkline-wrap">
                  <svg
                    class="trends-sparkline"
                    viewBox={`0 0 ${c().W} ${c().H}`}
                    width={c().W}
                    height={c().H}
                    aria-hidden="true"
                  >
                    <line class="trends-midline" x1={0} x2={c().W} y1={c().midY} y2={c().midY} />
                    <Show when={c().hasRating}>
                      <polyline class="trends-line-composite" fill="none" points={c().composite.line} />
                    </Show>
                    <Show when={c().hasVibes}>
                      <polyline class="trends-line-vibes" fill="none" points={c().vibes.line} />
                    </Show>
                    <For each={c().composite.dots}>
                      {(p) => <circle class="trends-dot-composite" cx={p.cx} cy={p.cy} r={1.9} />}
                    </For>
                    <For each={c().vibes.dots}>
                      {(p) => <circle class="trends-dot-vibes" cx={p.cx} cy={p.cy} r={1.9} />}
                    </For>
                  </svg>

                  <div class="trends-legend" aria-hidden="true">
                    <Show when={showRating()}>
                      <span class="trends-legend-item trends-legend-composite">{compositeLabel()}</span>
                    </Show>
                    <Show when={showVibes()}>
                      <span class="trends-legend-item trends-legend-vibes">{vibeLabel()}</span>
                    </Show>
                  </div>
                  <div class="trends-axis">
                    <span>{c().startLabel}</span>
                    <span class="trends-axis-mid">avg 50</span>
                    <span>{c().endLabel}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
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
          <Skeleton shape="line" width={150} height={12} />
          <Skeleton shape="line" width={110} height={40} />
          <Skeleton shape="line" width={336} height={148} />
          <Skeleton shape="line" width={240} height={12} />
        </section>
      </div>
    </Shell>
  );
}
