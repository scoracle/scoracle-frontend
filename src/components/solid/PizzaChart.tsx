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
  labelBlockWidth,
  sliceMidAngles,
  placeWideLabelsVertical,
  requiredLabelMargin,
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

// ─── Main Component ─────────────────────────────────────────────────────────

const statLabelWidth = (s: PizzaChartStat): number =>
  labelBlockWidth(s.label, s.value);

function PizzaChart(props: PizzaChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });
  const mids = createMemo(() => sliceMidAngles(props.stats.length, 2 * Math.PI));
  // Angle-aware placement: long labels to 12/6 o'clock, short to 3/9 — the
  // horizontal labels are what force the viewBox wider, so keeping them
  // short lets the disk render bigger. Slice colors read percentile tier
  // (not category), so order carries no meaning the reshuffle could break.
  const placed = createMemo(() =>
    placeWideLabelsVertical(props.stats, mids(), statLabelWidth),
  );
  const labelMargin = (): number => {
    const o = opts();
    if (o.labelMargin != null) return o.labelMargin;
    return requiredLabelMargin(
      placed(),
      mids(),
      statLabelWidth,
      o.outerRadius + o.labelOffset,
      o.width / 2,
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
        width: `${props.width + 2 * props.labelMargin}px`,
        'max-width': '100%',
        height: 'auto',
        margin: '0 auto',
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
                  outerRadius={props.outerRadius}
                  labelOffset={props.labelOffset}
                />
                <PercentileLabel
                  percentile={stat.percentile}
                  angle={midAngle()}
                  innerRadius={props.innerRadius}
                  sliceR={sr()}
                />
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
  outerRadius: number;
  labelOffset: number;
}) {
  const pos = () =>
    polarToCartesian(0, 0, props.outerRadius + props.labelOffset, props.angle);
  const anchor = () => textAnchor(pos().x);

  return (
    <>
      <text
        x={pos().x}
        y={pos().y - 6}
        text-anchor={anchor()}
        fill="var(--chart-label, #1a1a1a)"
        class="pizza-slice-label"
      >
        {props.stat.label}
      </text>
      <text
        x={pos().x}
        y={pos().y + 8}
        text-anchor={anchor()}
        fill="var(--chart-sublabel, #666666)"
        class="pizza-slice-sublabel"
      >
        {String(props.stat.value)}
      </text>
    </>
  );
}

function PercentileLabel(props: {
  percentile: number;
  angle: number;
  innerRadius: number;
  sliceR: number;
}) {
  const labelRadius = () => props.innerRadius + (props.sliceR - props.innerRadius) * 0.6;
  const pos = () => polarToCartesian(0, 0, labelRadius(), props.angle);

  return (
    <Show when={props.percentile >= 20}>
      <text
        x={pos().x}
        y={pos().y + 3}
        text-anchor="middle"
        fill="#ffffff"
        class="pizza-slice-percentile"
      >
        {Math.round(props.percentile)}
      </text>
    </Show>
  );
}

export default PizzaChart;
