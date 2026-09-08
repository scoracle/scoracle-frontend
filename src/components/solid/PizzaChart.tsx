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
 * Usage:
 *   <PizzaChart stats={stats()} />
 */

import { For, Show, createMemo } from 'solid-js';
import {
  describeArc,
  sliceRadius,
  percentileTierVar,
  textAnchor,
  polarToCartesian,
  placeWideLabelsVertical,
  requiredLabelMargin,
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
  width?: number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  labelOffset?: number;
  /** Override for the extra horizontal viewBox room the near-horizontal
   *  slice labels need. When omitted (the norm), the chart computes it
   *  from the placed labels' estimated widths — as tight as the data
   *  allows, so the disk renders as large as possible. Labels live inside
   *  the viewBox so they scale with the chart instead of cropping at the
   *  card edge (screen AND copied artifact) on narrow/portrait cards. */
  labelMargin?: number;
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
  outerRadius: 120,
  labelOffset: 30,
} as const;

const PAD_ANGLE = 0.02;

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
  /** Font size (viewBox units) and seat radius for the fitted text. */
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

// ─── Main Component ─────────────────────────────────────────────────────────

// Outer label type (PizzaChart.css): 12px UI name over a 10px numeric
// sublabel — ~0.52em per glyph.
const LABEL_CHAR_W = 6.24;
const VALUE_CHAR_W = 5.2;

const valueStr = (v: number | string): string => String(v ?? '—');

/** The outer label block: the stat name, plus the tally only when its wedge
 *  can't seat it inside (tallyFit's floor rule). */
const statLabelWidth = (
  s: PizzaChartStat,
  angleStep: number,
  innerRadius: number,
  outerRadius: number,
): number => {
  const fit = tallyFit(s.value, s.percentile, angleStep, innerRadius, outerRadius);
  return fit.fits
    ? s.label.length * LABEL_CHAR_W
    : Math.max(s.label.length * LABEL_CHAR_W, valueStr(s.value).length * VALUE_CHAR_W);
};

function PizzaChart(props: PizzaChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });
  const mids = createMemo(() => sliceMidAngles(props.stats.length, 2 * Math.PI));
  const angleStep = () => (2 * Math.PI) / props.stats.length;
  const widthOf = (s: PizzaChartStat): number =>
    statLabelWidth(s, angleStep(), opts().innerRadius, opts().outerRadius);
  // Each name is seated at ITS wedge's tip + the label gap (not on a shared
  // ring) — poor slices pull their name in close, rich ones keep it out at
  // the rim, and every name holds the same gap to its own slice edge.
  const labelRadiusOf = (s: PizzaChartStat): number =>
    sliceRadius(s.percentile, opts().innerRadius, opts().outerRadius) + opts().labelOffset;
  // Angle-aware placement: long labels to 12/6 o'clock, short to 3/9 — the
  // horizontal labels are what force the viewBox wider, so keeping them
  // short lets the disk render bigger. Slice colors read percentile tier
  // (not category), so order carries no meaning the reshuffle could break.
  const placed = createMemo(() =>
    placeWideLabelsVertical(props.stats, mids(), widthOf),
  );
  const labelMargin = (): number => {
    const o = opts();
    if (o.labelMargin != null) return o.labelMargin;
    return requiredLabelMargin(
      placed(),
      mids(),
      widthOf,
      o.outerRadius + o.labelOffset,
      o.width / 2,
      labelRadiusOf,
    );
  };

  return (
    <Show
      when={props.stats.length >= 2}
      fallback={<p class="chart-no-data">Not enough data for chart</p>}
    >
      <SingleChart
        stats={placed()}
        width={opts().width}
        height={opts().height}
        innerRadius={opts().innerRadius}
        outerRadius={opts().outerRadius}
        labelOffset={opts().labelOffset}
        labelMargin={labelMargin()}
      />
    </Show>
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
  labelMargin: number;
}) {
  const angleStep = () => (2 * Math.PI) / props.stats.length;

  return (
    <svg
      viewBox={`${-props.labelMargin} 0 ${props.width + 2 * props.labelMargin} ${props.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="pizza-chart-svg"
      style={{
        display: 'block',
        // Fill the chart cell: the meet-scaling centers the disk in
        // whatever room the card gives (the chart IS the card — Scott,
        // 2026-09-07), and the disk renders as large as the labels allow.
        width: '100%',
        height: '100%',
      }}
    >
      <g transform={`translate(${props.width / 2}, ${props.height / 2})`}>
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
      </g>
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
  // Seated at ITS wedge's tip + the gap (12px type needs the room), so the
  // name's distance to its slice edge is the same for every slice.
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
