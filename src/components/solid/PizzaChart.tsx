/**
 * PizzaChart — Solid.js SVG pizza/radar chart for percentile visualization
 *
 * Declarative SVG. Slices are sized by percentile (radius = percentile of
 * the inner-to-outer range), colored by percentile tier (5-level palette
 * via `--percentile-*` CSS variables).
 *
 * Hovering a slice subtly raises its opacity/radius and gives the surrounding
 * labels a restrained size step. Hit-testing extends across the full wedge
 * (inner→outer + label band) so even low-percentile slices are easy to target.
 *
 * The legacy comparison-overlay variant was dropped 2026-05-14 in favour of
 * the butterfly (mirror-halves) compare layout in StatsCard.
 *
 * Usage:
 *   <PizzaChart stats={stats()} />
 */

import { For, Show, createSignal } from 'solid-js';
import {
  describeArc,
  sliceRadius,
  percentileTierVar,
  textAnchor,
  polarToCartesian,
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
  /** Extra horizontal viewBox room for the near-horizontal slice labels,
   *  which extend past `width`. Inside the viewBox they scale with the
   *  chart instead of overflowing the SVG — and cropping at the card edge
   *  (screen AND copied artifact) on narrow/portrait cards. */
  labelMargin?: number;
}

interface PizzaChartProps {
  stats: PizzaChartStat[];
  options?: PizzaChartOptions;
  /** Slightly stronger hover: larger slice radius bump and label step. Used
   *  when the chart renders small (e.g., side-by-side compare) and the
   *  default boost would read too subtle. */
  intenseHover?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS = {
  width: 360,
  height: 360,
  innerRadius: 14,
  outerRadius: 120,
  labelOffset: 30,
  labelMargin: 90,
} as const;

const PAD_ANGLE = 0.02;
const HOVER_RADIUS_BOOST = 10;
const HOVER_RADIUS_BOOST_INTENSE = 18;
const HOVER_LABEL_BOOST = 4;
const HOVER_LABEL_BOOST_INTENSE = 7;

// ─── Main Component ─────────────────────────────────────────────────────────

function PizzaChart(props: PizzaChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });

  return (
    <Show
      when={props.stats.length >= 2}
      fallback={<p class="chart-no-data">Not enough data for chart</p>}
    >
      <SingleChart
        stats={props.stats}
        width={opts().width}
        height={opts().height}
        innerRadius={opts().innerRadius}
        outerRadius={opts().outerRadius}
        labelOffset={opts().labelOffset}
        labelMargin={opts().labelMargin}
        intenseHover={!!props.intenseHover}
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
  intenseHover: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = createSignal<number | null>(null);
  const angleStep = () => (2 * Math.PI) / props.stats.length;
  const radiusBoost = () =>
    props.intenseHover ? HOVER_RADIUS_BOOST_INTENSE : HOVER_RADIUS_BOOST;
  const labelBoost = () =>
    props.intenseHover ? HOVER_LABEL_BOOST_INTENSE : HOVER_LABEL_BOOST;

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
            const isHovered = () => hoveredIdx() === i();
            const sr = () =>
              sliceRadius(stat.percentile, props.innerRadius, props.outerRadius) +
              (isHovered() ? radiusBoost() : 0);

            return (
              <g
                class="pizza-slice"
                classList={{
                  'is-hovered': isHovered(),
                  'is-intense': props.intenseHover,
                }}
                onMouseEnter={() => setHoveredIdx(i())}
                onMouseLeave={() => setHoveredIdx((cur) => (cur === i() ? null : cur))}
              >
                {/* Full-wedge hit area so low-percentile slices are still
                    easy to target. Extends past `outerRadius + labelOffset`
                    by `radiusBoost` so that when a high-percentile slice is
                    hovered (visible arc grows outward modestly), the cursor
                    can sit anywhere along the boosted slice without falling
                    outside the hit area — otherwise hover state oscillates
                    on/off rapidly and the slice flickers. Drawn first so
                    the visible slice paints over it. */}
                <path
                  d={describeArc(
                    0, 0,
                    props.innerRadius,
                    props.outerRadius + props.labelOffset + radiusBoost(),
                    startAngle(), endAngle(), 0,
                  )}
                  fill="transparent"
                  style={{ 'pointer-events': 'all' }}
                />
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
                  hoverLabelBoost={labelBoost()}
                  isHovered={isHovered()}
                />
                <PercentileLabel
                  percentile={stat.percentile}
                  angle={midAngle()}
                  innerRadius={props.innerRadius}
                  sliceR={sr()}
                  isHovered={isHovered()}
                />
              </g>
            );
          }}
        </For>

        {/* Center circle */}
        <circle r={props.innerRadius - 2} fill="var(--bg-card, #ffffff)" />
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
  hoverLabelBoost: number;
  isHovered: boolean;
}) {
  const pos = () =>
    polarToCartesian(
      0, 0,
      props.outerRadius + props.labelOffset + (props.isHovered ? props.hoverLabelBoost : 0),
      props.angle,
    );
  const anchor = () => textAnchor(pos().x);

  return (
    <>
      <text
        x={pos().x}
        y={pos().y - 6}
        text-anchor={anchor()}
        fill="var(--chart-label, #1a1a1a)"
        class="pizza-slice-label"
        classList={{ 'is-hovered': props.isHovered }}
      >
        {props.stat.label}
      </text>
      <text
        x={pos().x}
        y={pos().y + 8}
        text-anchor={anchor()}
        fill="var(--chart-sublabel, #666666)"
        class="pizza-slice-sublabel"
        classList={{ 'is-hovered': props.isHovered }}
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
  isHovered: boolean;
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
        classList={{ 'is-hovered': props.isHovered }}
      >
        {Math.round(props.percentile)}
      </text>
    </Show>
  );
}

export default PizzaChart;
