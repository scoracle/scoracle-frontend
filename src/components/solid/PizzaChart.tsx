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
 * the butterfly (mirror-halves) compare layout (now on the Scouting card).
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
import {
  describeArc,
  sliceRadius,
  percentileTierVar,
  textAnchor,
  polarToCartesian,
  placeWideLabelsVertical,
  sliceMidAngles,
} from '../../lib/charts/arc-math';
import './PizzaChart.css';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PizzaChartStat {
  key: string;
  label: string;
  value: number | string;
  percentile: number;
  categoryId?: string;
}

export interface PizzaChartOptions {
  /** Opening box, in CSS px, used until the cell is measured (and on the
   *  server, where there is nothing to measure). The real box is whatever
   *  the chart cell turns out to be. */
  width?: number;
  height?: number;
  innerRadius?: number;
  /** Hard ceiling on the disk radius. Omit to let the disk take the box. */
  outerRadius?: number;
  /** The GAP from each wedge's tip to its name — names seat per-slice, not
   *  on a shared ring. */
  labelOffset?: number;
}

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

const PAD_ANGLE = 0.02;

// Type sizes are CSS PIXELS now (see the header): what these say is what the
// reader gets, on a peeked card and a lifted one alike. Mirrored in
// PizzaChart.css so the DOM and the layout solver agree.
const LABEL_FONT = 13;
const VALUE_FONT = 10.5;
// Per-glyph width estimates at those sizes. `--font-ui` is Fraunces — a
// SERIF, not a compact UI sans — so these run wider than a typical estimate,
// and they are deliberately generous: the old layout absorbed estimate error
// in a 12-unit margin pad past the widest label, and the solver has to carry
// that safety itself now (see BOX_PAD). Over-estimating costs a few px of
// radius; under-estimating pushes a name off the cardstock.
const LABEL_CHAR_W = LABEL_FONT * 0.55;
const VALUE_CHAR_W = VALUE_FONT * 0.58;
// Half-height reserved for the outer label block. The solver always reserves
// the TWO-LINE box (name over tally) even for wedges that will end up seating
// their tally inside: it makes `fits()` monotonic in R, and over-reserving
// costs a few px of radius where under-reserving costs a clipped label.
const LABEL_BLOCK_HALF_H = 20;
// Breathing room between the outermost ink and the cell's edge — and the
// slack that absorbs the per-glyph estimate above. Inherits the job the
// retired LABEL_MARGIN_PAD used to do in arc-math's viewBox widening.
const BOX_PAD = 8;

// ─── Dynamic tally type (Scott, 2026-09-07) ─────────────────────────────────
// The tally sizes and seats itself to its wedge: as large as the wedge's
// angular width allows at a rim-anchored seat, between a floor and a cap.
// A wedge too small for even the floor sends its tally back outside under
// the name — nothing is ever hidden, nothing is ever clipped.

const TALLY_FONT_MAX = 15;
const TALLY_FONT_MIN = 8.5;
const TALLY_FONT_STEP = 0.5;
// ~0.62em per glyph in the numeric semibold cut.
const TALLY_CHAR_EM = 0.62;
// The seat hugs the rim: the text's outer edge sits this many units inside
// the wedge's arc, so it never reads as stamped on the boundary nor as
// floating at the wedge's center.
const TALLY_RIM_GAP = 4;
// The tally may span at most this share of the wedge's chord at its seat —
// the rest is breathing room clear of the slice stroke.
const TALLY_CHORD_SHARE = 0.8;

export interface TallyFit {
  /** False → the wedge can't seat the tally; it falls back outside. */
  fits: boolean;
  /** Font size (CSS px) and seat radius for the fitted text. */
  font: number;
  radius: number;
}

/** Fit the tally to one wedge: the largest type (floor→cap) whose width
 *  clears the chord at the rim-anchored seat that type implies. */
function tallyFit(
  value: number | string,
  percentile: number,
  angleStep: number,
  innerRadius: number,
  outerRadius: number,
): TallyFit {
  const text = String(value);
  const sliceR = sliceRadius(percentile, innerRadius, outerRadius);
  const sweep = angleStep - PAD_ANGLE;
  for (let f = TALLY_FONT_MAX; f >= TALLY_FONT_MIN; f -= TALLY_FONT_STEP) {
    const radius = sliceR - f * 0.75 - TALLY_RIM_GAP;
    if (radius - f * 0.5 <= innerRadius) break; // no radial room for the glyphs
    const chord = 2 * radius * Math.sin(sweep / 2);
    if (text.length * TALLY_CHAR_EM * f <= TALLY_CHORD_SHARE * chord) {
      return { fits: true, font: f, radius };
    }
  }
  return { fits: false, font: TALLY_FONT_MIN, radius: sliceR };
}

// ─── Layout ─────────────────────────────────────────────────────────────────

const valueStr = (v: number | string): string => String(v ?? '—');

/** The widest line of a stat's outer label block. The tally line is counted
 *  whether or not this wedge ends up seating its tally inside — same
 *  monotonicity reason as LABEL_BLOCK_HALF_H, and the tally lines are short
 *  numbers, so the reservation costs almost nothing. */
const outerBlockWidth = (s: PizzaChartStat): number =>
  Math.max(s.label.length * LABEL_CHAR_W, valueStr(s.value).length * VALUE_CHAR_W);

/**
 * Does a disk of radius R — arcs AND outer labels — fit the half-box?
 * Monotonic in R by construction, which is what lets solveRadius bisect.
 */
function fits(
  stats: PizzaChartStat[],
  mids: number[],
  R: number,
  halfW: number,
  halfH: number,
  innerRadius: number,
  labelOffset: number,
): boolean {
  // The disk's own bounding circle. Conservative across every sweep, and it
  // is what keeps a 100th-percentile wedge off the cardstock edge.
  if (R > Math.min(halfW, halfH) - BOX_PAD) return false;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const labelR = sliceRadius(s.percentile, innerRadius, R) + labelOffset;
    const x = Math.cos(mids[i]) * labelR;
    const y = Math.sin(mids[i]) * labelR;
    const w = outerBlockWidth(s);
    // Mirrors textAnchor(): an end-anchored label runs its full width away
    // from the center, a middle-anchored one splits it either side.
    const reach = Math.abs(x) > 10 ? w : w / 2;
    if (Math.abs(x) + reach > halfW - BOX_PAD) return false;
    if (Math.abs(y) + LABEL_BLOCK_HALF_H > halfH - BOX_PAD) return false;
  }
  return true;
}

/** The largest radius that still fits the box. Bisection rather than algebra:
 *  the constraints are linear in R but there are two of them per slice plus
 *  the anchor switch, and a 24-step search is both exact enough (sub-pixel)
 *  and impossible to get subtly wrong. */
function solveRadius(
  stats: PizzaChartStat[],
  mids: number[],
  halfW: number,
  halfH: number,
  innerRadius: number,
  labelOffset: number,
  cap: number | undefined,
): number {
  let lo = 0;
  let hi = Math.min(halfW, halfH);
  if (cap != null) hi = Math.min(hi, cap);
  if (!fits(stats, mids, lo, halfW, halfH, innerRadius, labelOffset)) {
    // The box can't even hold the labels at zero radius (a card squeezed to
    // nothing). Draw something rather than nothing; the cell clips.
    return Math.max(8, hi * 0.5);
  }
  for (let n = 0; n < 24; n++) {
    const mid = (lo + hi) / 2;
    if (fits(stats, mids, mid, halfW, halfH, innerRadius, labelOffset)) lo = mid;
    else hi = mid;
  }
  return Math.max(8, lo);
}

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
        sliceRadius(s.percentile, o.innerRadius, seed) + o.labelOffset + outerBlockWidth(s);
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
          const midAngle = () => (startAngle() + endAngle()) / 2;
          const sr = () =>
            sliceRadius(stat.percentile, props.innerRadius, props.outerRadius);
          const fit = () =>
            tallyFit(stat.value, stat.percentile, angleStep(), props.innerRadius, props.outerRadius);

          return (
            <g class="pizza-slice">
              <path
                class="pizza-slice-arc"
                d={describeArc(0, 0, props.innerRadius, sr(), startAngle(), endAngle(), PAD_ANGLE)}
                fill={percentileTierVar(stat.percentile)}
                fill-opacity="0.85"
                stroke="var(--chart-ring, #e5e5e5)"
                stroke-width="1"
              />
              <SliceLabel
                stat={stat}
                angle={midAngle()}
                showsTally={!fit().fits}
                innerRadius={props.innerRadius}
                outerRadius={props.outerRadius}
                labelOffset={props.labelOffset}
              />
              <TallyLabel stat={stat} angle={midAngle()} fit={fit()} />
            </g>
          );
        }}
      </For>
    </svg>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SliceLabel(props: {
  stat: PizzaChartStat;
  angle: number;
  showsTally: boolean;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
}) {
  // Seated at ITS wedge's tip + the gap, so the name's distance to its slice
  // edge is the same for every slice.
  const pos = () =>
    polarToCartesian(
      0,
      0,
      sliceRadius(props.stat.percentile, props.innerRadius, props.outerRadius) + props.labelOffset,
      props.angle,
    );
  const anchor = () => textAnchor(pos().x);
  // Wedges too small to seat the tally carry it out here under the name
  // (tallyFit's floor rule); the rest hold it inside.

  return (
    <>
      <text
        x={pos().x}
        y={pos().y - (props.showsTally ? 7 : 4)}
        text-anchor={anchor()}
        fill="var(--chart-label, #1a1a1a)"
        class="pizza-slice-label"
      >
        {props.stat.label}
      </text>
      <Show when={props.showsTally}>
        <text
          x={pos().x}
          y={pos().y + 9}
          text-anchor={anchor()}
          fill="var(--chart-sublabel, #666666)"
          class="pizza-slice-sublabel"
        >
          {valueStr(props.stat.value)}
        </text>
      </Show>
    </>
  );
}

function TallyLabel(props: {
  stat: PizzaChartStat;
  angle: number;
  fit: TallyFit;
}) {
  const pos = () => polarToCartesian(0, 0, props.fit.radius, props.angle);

  return (
    <Show when={props.fit.fits}>
      <text
        x={pos().x}
        y={pos().y + props.fit.font * 0.35}
        font-size={String(props.fit.font)}
        text-anchor="middle"
        fill="#ffffff"
        class="pizza-slice-tally"
      >
        {String(props.stat.value)}
      </text>
    </Show>
  );
}

export default PizzaChart;
