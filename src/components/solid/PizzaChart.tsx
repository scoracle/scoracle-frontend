/**
 * PizzaChart — Solid.js SVG pizza/radar chart for percentile visualization
 *
 * Declarative SVG. Slices are sized by percentile (radius = percentile of
 * the inner-to-outer range), colored by percentile tier (5-level palette
 * via `--percentile-*` CSS variables).
 *
 * Presentation-only: the slice hover/intense-hover interactivity retired
 * 2026-07-22 (Characters Phase 1 — the Scouting card's pizza is a reading,
 * not a widget). The chart still re-renders reactively for scope/rate/season
 * condition changes; only pointer response is gone.
 *
 * The legacy comparison-overlay variant was dropped 2026-05-14 in favour of
 * the butterfly (mirror-halves) compare layout on the Profile card.
 *
 * ─── The coordinate system is CSS PIXELS (Scott, 2026-09-08) ───────────────
 *
 * This chart used to draw into a fixed 400-wide viewBox that `meet`-scaled
 * into whatever room the card gave it, and the type went along for the ride:
 * a 12-unit name rendered at 12 × (cell width ÷ viewBox width). The viewBox
 * width was itself computed from the labels, so an entity with LONG stat
 * names widened the viewBox, shrank the scale, and got SMALLER type than an
 * entity with short ones. Same card, same card size, two different reading
 * sizes — decided by nothing the reader could see.
 *
 * So the viewBox is now the measured cell, 1:1: one user unit is one CSS
 * pixel, and `LABEL_FONT` is a real 13px on every card. What flexes instead
 * is the DISK — `solveRadius` finds the largest radius whose arcs and whose
 * outer labels both still fit the measured box, so the chart takes all the
 * room it has and never crops. (Under the lift the whole card is CSS-scaled,
 * so the type grows with it — that is the lift's entire point, and it is a
 * transform, so it never re-triggers measurement.)
 *
 * Before the first measurement — SSR, and the hydration frame — the box
 * falls back to `options.width`/`height`, which is why those stay in the
 * options: they are the opening guess, not the geometry.
 *
 * Usage:
 *   <PizzaChart stats={stats()} />
 */

import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { placeWideLabelsVertical, sliceMidAngles } from '../../lib/charts/arc-math';
import { outerBlockWidth, solveRadius, type PizzaChartStat, type PizzaChartOptions } from '../../lib/charts/pizza-geometry';
import { pizzaLabelRadius } from '../../lib/charts/pizza-label-layout';
import PizzaSlice from './PizzaSlice';
import './PizzaChart.css';

export type { PizzaChartStat, PizzaChartOptions, TallyFit } from '../../lib/charts/pizza-geometry';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PizzaChartProps {
  stats: PizzaChartStat[];
  options?: PizzaChartOptions;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS = {
  width: 360,
  height: 360,
  // True pizza: slices meet at the center point (no donut hole). A nonzero
  // innerRadius is still honored via options for any future ring variant.
  innerRadius: 0,
  labelOffset: 14,
} as const;

// ─── Main Component ─────────────────────────────────────────────────────────

function PizzaChart(props: PizzaChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });

  // The cell, measured. Until it is (SSR + the hydration frame) the options'
  // box stands in, so the server paints a sane chart and the swap on mount is
  // a size correction, not an appearance.
  const [box, setBox] = createSignal<{ w: number; h: number } | null>(null);
  let hostEl: HTMLDivElement | undefined;

  onMount(() => {
    if (!hostEl) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || r.width < 1 || r.height < 1) return;
      // Round: sub-pixel churn would re-solve the radius on every scroll-
      // driven layout nudge without changing a thing on screen.
      setBox((prev) => {
        const w = Math.round(r.width);
        const h = Math.round(r.height);
        return prev && prev.w === w && prev.h === h ? prev : { w, h };
      });
    });
    ro.observe(hostEl);
    onCleanup(() => ro.disconnect());
  });

  const width = () => box()?.w ?? opts().width;
  const height = () => box()?.h ?? opts().height;

  const mids = createMemo(() => sliceMidAngles(props.stats.length, 2 * Math.PI));

  /**
   * Placement and radius are ONE decision, because each decides the other:
   * which stat sits at 3 o'clock is what binds the radius, and the radius is
   * what says how far out that stat's name sits. Slice colors read percentile
   * tier (not category) and the wedges are a set, not a sequence, so the
   * reshuffle costs the reader nothing.
   *
   * Two candidate seatings, and the one that lets the disk grow bigger wins:
   *
   *  A — widest NAME to the most vertical slot. The long-standing rule, and
   *      still the right one when the names differ wildly in length.
   *  B — biggest horizontal REACH to the most vertical slot, where reach is
   *      how far the name's far edge actually lands: its wedge's radius plus
   *      the gap plus its own width. A short name on a 100th-percentile wedge
   *      sits further out than a long name on a 30th-percentile one, and rule
   *      A can't see that — it seats "Shooting" (8 characters, full radius) on
   *      the horizontal axis and loses a third of the disk to it. Reach needs
   *      a radius to be computed from, so B is seeded with the box and
   *      re-solved once; it converges immediately in practice.
   *
   * Best-of-both rather than replacing A with B: over a few thousand random
   * decks B wins by a wide margin on average and by up to ~90px, but loses to
   * A on about one deck in ten. Solving both costs two bisections of pure
   * arithmetic, and this way the chart is never smaller than it used to be.
   */
  const layout = createMemo(() => {
    const o = opts();
    const m = mids();
    const halfW = width() / 2;
    const halfH = height() / 2;
    const solveFor = (p: PizzaChartStat[]) =>
      solveRadius(p, m, halfW, halfH, o.innerRadius, o.labelOffset, props.options?.outerRadius);

    // placeWideLabelsVertical is a generic "biggest key → most vertical slot"
    // assignment; the key is the width for A and the reach for B.
    let stats = placeWideLabelsVertical(props.stats, m, outerBlockWidth);
    let radius = solveFor(stats);

    let seed = Math.min(halfW, halfH);
    for (let pass = 0; pass < 2; pass++) {
      const reachOf = (s: PizzaChartStat) =>
        pizzaLabelRadius(s.percentile, o.innerRadius, seed, o.labelOffset) + outerBlockWidth(s);
      const byReach = placeWideLabelsVertical(props.stats, m, reachOf);
      const r = solveFor(byReach);
      if (r > radius) {
        radius = r;
        stats = byReach;
      }
      if (Math.abs(r - seed) < 0.5) break;
      seed = r;
    }
    return { stats, radius };
  });

  return (
    <div class="pizza-chart-host" ref={hostEl}>
      <Show
        when={props.stats.length >= 2}
        fallback={<p class="chart-no-data">Not enough data for chart</p>}
      >
        <SingleChart
          stats={layout().stats}
          width={width()}
          height={height()}
          innerRadius={opts().innerRadius}
          outerRadius={layout().radius}
          labelOffset={opts().labelOffset}
        />
      </Show>
    </div>
  );
}

// ─── Single Entity Chart ────────────────────────────────────────────────────

function SingleChart(props: {
  stats: PizzaChartStat[];
  width: number;
  height: number;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
}) {
  const angleStep = () => (2 * Math.PI) / props.stats.length;

  return (
    <svg
      // Origin at the disk's center, extents = the measured half-box: one
      // user unit is one CSS pixel, so nothing here is ever rescaled.
      viewBox={`${-props.width / 2} ${-props.height / 2} ${props.width} ${props.height}`}
      class="pizza-chart-svg"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <For each={props.stats}>
        {(stat, i) => {
          const startAngle = () => i() * angleStep() - Math.PI / 2;
          const endAngle = () => startAngle() + angleStep();
          return (
            <PizzaSlice
              stat={stat}
              startAngle={startAngle()}
              endAngle={endAngle()}
              innerRadius={props.innerRadius}
              outerRadius={props.outerRadius}
              labelOffset={props.labelOffset}
            />
          );
        }}
      </For>
    </svg>
  );
}

export default PizzaChart;
