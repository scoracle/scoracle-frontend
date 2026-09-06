/**
 * MomentumCard — the entity's season Trends: two sparklines on one shared 0-100
 * axis, so on-court rating and public sentiment read against each other:
 *
 *   Composite — rating_pct per event [/stats]
 *   Vibe      — sentiment_avg per day          [/trends]
 *
 * Both series are tier-colored from their current score.
 *
 * The Composite 0-100 value is the positionless per-event percentile (backend
 * migration 029); the vibe value is the daily-averaged sentiment. X is a true
 * time axis (oldest left → newest right), shared by both series, so a per-game
 * rating dot and a per-day vibe dot line up by date.
 *
 * Uniform card contract (Scott, 2026-08-21): the Analyst's VERDICT — the
 * /momentum/summary blurb — is the card's text; the sparklines are one View
 * flip away in the rail (?view=chart). The old score row (Rating · Momentum ·
 * Vibe numerals, direction glyph) retired as noise. The card renders the
 * served verdict verbatim and never derives one locally; with no fresh
 * summary row the text view holds a quiet pending line (the sparklines still
 * carry the chart view).
 *
 * Data: getStats drives the rating line, getMomentum drives the vibe line,
 * and getMomentumSummary drives the verdict. Empty only when none exist.
 */

import { createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getMomentum } from "../../lib/data/momentum.server";
import { getMomentumSummary } from "../../lib/data/momentum-summary.server";
import { getStats } from "../../lib/data/stats.server";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./MomentumCard.css";

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
interface Spark {
  W: number;
  H: number;
  midY: number;
  line: string;
  dots: Pt[];
  startLabel: string;
  endLabel: string;
}

/** Build one sparkline (polyline + dots + 50-midline + date labels) from a
 *  chronological {t, v} series, scaled 0-100 in its own W×H box. */
function buildSpark(rows: { t: number; v: number }[], W: number, H: number): Spark | null {
  if (!rows.length) return null;
  const PAD_X = 8;
  const PAD_Y = 8;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;
  const yFor = (v: number) => PAD_Y + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  const ts = rows.map((r) => r.t);
  const startMs = Math.min(...ts);
  const endMs = Math.max(...ts);
  const span = Math.max(endMs - startMs, 1);
  const xFor = (ms: number) =>
    rows.length <= 1 ? W / 2 : PAD_X + ((ms - startMs) / span) * plotW;
  return {
    W,
    H,
    midY: yFor(50),
    line: rows.map((r) => `${xFor(r.t)},${yFor(r.v)}`).join(" "),
    dots: rows.map((r) => ({ cx: xFor(r.t), cy: yFor(r.v) })),
    startLabel: formatAxisDate(new Date(startMs).toISOString()),
    endLabel: formatAxisDate(new Date(endMs).toISOString()),
  };
}

export default function MomentumCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // Momentum = the Rating trajectory + the Vibe trajectory. "Rating" is the
  // product's name (its card retired into Scouting, Characters Phase 1).
  const compositeLabel = () => "Rating";
  // The sentiment series IS the Vibe (the emotional end product) trajectory.
  const sentimentLabel = () => "Vibe";

  // Stats drives the rating lines; momentum drives the vibe line. Both warm via
  // the tab preload, so they're cache-warm by the time the user lands here.
  const stats = createAsync(() => getStats(sport(), type(), id(), ctx.season()));
  const trends = createAsync(() => getMomentum(sport(), type(), id(), ctx.season()));
  // The generated verdict (direction/score/blurb). Null summary = no fresh row
  // (72h live gate) — the headline hides and the sparklines carry the card.
  const momentumSummary = createAsync(() =>
    getMomentumSummary(sport(), type(), id(), ctx.season()),
  );
  const verdict = createMemo(() => momentumSummary()?.summary ?? null);

  const rating = createMemo(() => stats()?.rating ?? null);
  const trendsIdentifier = () => "Season trajectory, rating and vibe";
  // The Analyst's card score — the signed momentum_score recentered onto the
  // display scale. Centralized in deck-scores.ts (createDeckScoreReader): the
  // meta-card ring reads the same derivation, so the two can't diverge.
  const cardScore = createDeckScoreReader(ctx, "momentum");

  // Per-event Composite (0-100), chronological. Guard each point so a stray null
  // can't break the polyline.
  const ratingEvents = createMemo(() => {
    const d = stats();
    if (!d) return [];
    return [...d.events]
      .filter((e) => e.rating_pct != null)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
  });

  // Daily-averaged sentiment series (0-100), chronological.
  const sentimentSeries = createMemo(() => {
    const s = trends()?.entity_season_sentiment_series ?? [];
    return [...s].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  });

  const showRating = createMemo(() => rating() != null && ratingEvents().length > 0);
  const showSentiment = createMemo(() => sentimentSeries().length > 0);
  const isEmpty = createMemo(() => !showRating() && !showSentiment() && !verdict());

  // Two season scores (0-100), tier-colored, used ONLY as the sparklines'
  // stroke colors now — the in-card numerals retired with the uniform card
  // contract (the score slot and the rail carry the numbers).
  // Players read the magnitude SCORE; teams the percentile RANK — matches the
  // meta-header rating chip + the Scouting card (magnitude is players-only).
  const generalScore = (): number | null => {
    const r = type() === "team" ? rating()?.rating_rank : rating()?.rating_score;
    return r != null ? Math.round(r) : null;
  };
  const generalScoreColor = (): string => {
    const s = generalScore();
    if (s == null) return tierColor(50);
    return type() === "team" ? tierColor(s) : tierColorScore(s);
  };
  const sentimentScore = (): number | null => {
    const vs = sentimentSeries();
    return vs.length ? Math.round(vs[vs.length - 1].sentiment_avg) : null;
  };

  // Two independent sparklines, each scaled 0-100 in its own box.
  const SPARK_W = 420;
  // Tall enough to command the portrait card alongside the two scores —
  // more vertical room also gives the series' amplitude space to speak.
  const SPARK_H = 96;
  const generalSpark = createMemo(() =>
    buildSpark(
      ratingEvents().map((e) => ({ t: new Date(e.start_time).getTime(), v: e.rating_pct })),
      SPARK_W,
      SPARK_H,
    ),
  );
  const sentimentSpark = createMemo(() =>
    buildSpark(
      sentimentSeries().map((v) => ({ t: new Date(v.date).getTime(), v: v.sentiment_avg })),
      SPARK_W,
      SPARK_H,
    ),
  );

  // One sparkline block: caps label + tier-colored line/dots + date range.
  const sparkBlock = (label: string, color: string, s: Spark) => (
    <div class="trends-spark">
      <span class="card-micro-eyebrow trends-spark-label">{label}</span>
      <svg
        class="trends-sparkline"
        viewBox={`0 0 ${s.W} ${s.H}`}
        width={s.W}
        height={s.H}
        aria-hidden="true"
      >
        <line class="trends-midline" x1={0} x2={s.W} y1={s.midY} y2={s.midY} />
        <polyline
          fill="none"
          stroke={color}
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          points={s.line}
        />
        <For each={s.dots}>
          {(p) => <circle cx={p.cx} cy={p.cy} r={1.9} fill={color} stroke="var(--bg-card)" stroke-width="1" />}
        </For>
      </svg>
      <div class="trends-axis">
        <span>{s.startLabel}</span>
        <span>{s.endLabel}</span>
      </div>
    </div>
  );

  return (
    <Show when={stats() ?? trends() ?? momentumSummary()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty()} fallback={<EmptyCard />}>
          <Card
            id="momentum"
            as="article"
            aria-label="Trends"
            score={cardScore}
          >
            <p class="card-identifier">{trendsIdentifier()}</p>
            {/* One face (Scott, 2026-09-06): hook, then the sparklines, then
                the verdict — the prose is minimal by design, so the chart
                always fits between header and body and the View posture flip
                retired with its control. */}
            <Show when={verdict()?.headline}>
              <h2 class="card-hook">{verdict()!.headline}</h2>
            </Show>
            <div class="trends-card">
              {/* keyed: the spark memos return a fresh object per recompute, and
                  sparkBlock reads it eagerly (plain props, not accessors). A non-keyed
                  <Show> only re-runs its child on falsy→truthy flips, so season/entity
                  changes left the SVG frozen on the first-rendered series. */}
              <Show when={generalSpark()} keyed>
                {(g) => sparkBlock(compositeLabel(), generalScoreColor(), g)}
              </Show>
              <Show when={sentimentSpark()} keyed>
                {(v) => sparkBlock(sentimentLabel(), tierColor(sentimentScore() ?? 50), v)}
              </Show>
            </div>
            <Show
              when={verdict()?.body}
              fallback={<p class="card-text-pending">Momentum reading pending.</p>}
            >
              {(b) => <GemmaSummary text={b()} class="trends-verdict-blurb" />}
            </Show>
          </Card>
        </Show>
      )}
    </Show>
  );
}
