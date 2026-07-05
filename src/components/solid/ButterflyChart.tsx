/**
 * ButterflyChart — Mirror-halves compare chart (Solid.js SVG).
 *
 * One circular chart split vertically. The primary entity sweeps the
 * left semicircle; the compare entity sweeps the right semicircle.
 * Each stat appears mirrored, with the same percentile-tier colors as
 * the single-entity PizzaChart — spatial separation does the
 * attribution work, no overlay muddiness possible.
 *
 * Hover is linked across the pair: hovering a slice on one side
 * highlights its mirror on the other side simultaneously, so the
 * user can read both entities' values for a stat in one motion.
 *
 * Empty side: when one entity is missing data for a stat, the present
 * side draws normally and the missing side renders a stroke-only
 * outlined wedge with an em-dash inside — the pair stays intact so
 * comparison context isn't dropped.
 *
 * Shares geometry primitives with PizzaChart via arc-math.ts.
 */

import { For, Show, createSignal } from 'solid-js';
import {
  describeArc,
  sliceRadius,
  percentileTierVar,
  textAnchor,
  polarToCartesian,
} from '../../lib/charts/arc-math';
import './ButterflyChart.css';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ButterflyStat {
  key: string;
  label: string;
  leftValue: number | string | null;
  leftPercentile: number | null;
  rightValue: number | string | null;
  rightPercentile: number | null;
}

export interface ButterflyChartOptions {
  width?: number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  labelOffset?: number;
}

interface ButterflyChartProps {
  stats: ButterflyStat[];
  options?: ButterflyChartOptions;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS = {
  width: 400,
  height: 360,
  innerRadius: 14,
  outerRadius: 130,
  labelOffset: 22,
} as const;

const PAD_ANGLE = 0.02;
const HOVER_RADIUS_BOOST = 10;
const HOVER_LABEL_BOOST = 3;

// ─── Main component ─────────────────────────────────────────────────────────

function ButterflyChart(props: ButterflyChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });
  return (
    <Show
      when={props.stats.length >= 2}
      fallback={<p class="chart-no-data">Not enough data for chart</p>}
    >
      <ChartBody
        stats={props.stats}
        width={opts().width}
        height={opts().height}
        innerRadius={opts().innerRadius}
        outerRadius={opts().outerRadius}
        labelOffset={opts().labelOffset}
      />
    </Show>
  );
}

// ─── Chart body ─────────────────────────────────────────────────────────────

function ChartBody(props: {
  stats: ButterflyStat[];
  width: number;
  height: number;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
}) {
  const [hoveredIdx, setHoveredIdx] = createSignal<number | null>(null);
  // Each side gets π radians spread across N slices.
  const stepPerSide = () => Math.PI / props.stats.length;

  const setHover = (i: number | null) => setHoveredIdx(i);
  const clearHoverIfMatch = (i: number) =>
    setHoveredIdx((cur) => (cur === i ? null : cur));

  return (
    <svg
      viewBox={`0 0 ${props.width} ${props.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="butterfly-chart-svg"
      style={{
        display: 'block',
        width: `${props.width}px`,
        'max-width': '100%',
        height: 'auto',
        margin: '0 auto',
        overflow: 'visible',
      }}
    >
      <g transform={`translate(${props.width / 2}, ${props.height / 2})`}>
        {/* Half-disc washes (drawn first, behind everything). */}
        <BackgroundHalf
          side="left"
          outerRadius={props.outerRadius + props.labelOffset}
        />
        <BackgroundHalf
          side="right"
          outerRadius={props.outerRadius + props.labelOffset}
        />

        {/* Center divider hairline along the vertical axis. */}
        <line
          x1={0}
          y1={-(props.outerRadius + props.labelOffset)}
          x2={0}
          y2={props.outerRadius + props.labelOffset}
          class="butterfly-divider"
        />

        {/* Slices — mirrored pairs. */}
        <For each={props.stats}>
          {(stat, i) => (
            <StatPair
              stat={stat}
              idx={i()}
              stepPerSide={stepPerSide()}
              innerRadius={props.innerRadius}
              outerRadius={props.outerRadius}
              labelOffset={props.labelOffset}
              hovered={hoveredIdx() === i()}
              onEnter={() => setHover(i())}
              onLeave={() => clearHoverIfMatch(i())}
            />
          )}
        </For>

        {/* Center cap — covers the inner anchor of all slices. */}
        <circle r={props.innerRadius - 2} class="butterfly-center" />
      </g>
    </svg>
  );
}

// ─── Half-disc background ───────────────────────────────────────────────────

function BackgroundHalf(props: { side: 'left' | 'right'; outerRadius: number }) {
  // Right half spans angles [-π/2, π/2] (12 o'clock → 3 → 6). Left half
  // spans [π/2, 3π/2] (6 → 9 → 12). innerRadius = 0 so the wash fills
  // the full half-disc.
  const startAngle = props.side === 'right' ? -Math.PI / 2 : Math.PI / 2;
  const endAngle = props.side === 'right' ? Math.PI / 2 : (3 * Math.PI) / 2;
  return (
    <path
      d={describeArc(0, 0, 0, props.outerRadius, startAngle, endAngle, 0)}
      class={`butterfly-half butterfly-half-${props.side}`}
    />
  );
}

// ─── A mirrored stat pair (one slice per side + shared/per-side labels) ────

function StatPair(props: {
  stat: ButterflyStat;
  idx: number;
  stepPerSide: number;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  // Right wedge: -π/2 + i·step → -π/2 + (i+1)·step.
  const rightStart = () => -Math.PI / 2 + props.idx * props.stepPerSide;
  const rightEnd = () => rightStart() + props.stepPerSide;
  const rightMid = () => (rightStart() + rightEnd()) / 2;
  // Left wedge mirrors across the vertical axis: -π/2 - (i+1)·step → -π/2 - i·step.
  const leftStart = () => -Math.PI / 2 - (props.idx + 1) * props.stepPerSide;
  const leftEnd = () => -Math.PI / 2 - props.idx * props.stepPerSide;
  const leftMid = () => (leftStart() + leftEnd()) / 2;

  const radiusFor = (p: number | null) =>
    p === null
      ? props.innerRadius
      : sliceRadius(p, props.innerRadius, props.outerRadius) +
        (props.hovered ? HOVER_RADIUS_BOOST : 0);

  return (
    <g
      class="butterfly-pair"
      classList={{ 'is-hovered': props.hovered }}
      onMouseEnter={props.onEnter}
      onMouseLeave={props.onLeave}
    >
      {/* LEFT side (entity A / primary) */}
      <SideWedge
        side="left"
        value={props.stat.leftValue}
        percentile={props.stat.leftPercentile}
        startAngle={leftStart()}
        endAngle={leftEnd()}
        midAngle={leftMid()}
        sliceR={radiusFor(props.stat.leftPercentile)}
        innerRadius={props.innerRadius}
        outerRadius={props.outerRadius}
        labelOffset={props.labelOffset}
        label={props.stat.label}
        hovered={props.hovered}
      />

      {/* RIGHT side (entity B / compare) */}
      <SideWedge
        side="right"
        value={props.stat.rightValue}
        percentile={props.stat.rightPercentile}
        startAngle={rightStart()}
        endAngle={rightEnd()}
        midAngle={rightMid()}
        sliceR={radiusFor(props.stat.rightPercentile)}
        innerRadius={props.innerRadius}
        outerRadius={props.outerRadius}
        labelOffset={props.labelOffset}
        label={props.stat.label}
        hovered={props.hovered}
      />
    </g>
  );
}

// ─── One side of a stat pair ────────────────────────────────────────────────

function SideWedge(props: {
  side: 'left' | 'right';
  value: number | string | null;
  percentile: number | null;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  sliceR: number;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
  label: string;
  hovered: boolean;
}) {
  const present = () => props.percentile !== null;

  return (
    <g class={`butterfly-side butterfly-side-${props.side}`}>
      {/* Full-wedge hit area covering the visible slice + label band so
          hover state stays sticky when the user mouses across the label. */}
      <path
        d={describeArc(
          0, 0,
          props.innerRadius,
          props.outerRadius + props.labelOffset + HOVER_RADIUS_BOOST,
          props.startAngle, props.endAngle, 0,
        )}
        fill="transparent"
        style={{ 'pointer-events': 'all' }}
      />

      <Show
        when={present()}
        fallback={
          <MissingWedge
            innerRadius={props.innerRadius}
            outerRadius={props.outerRadius}
            startAngle={props.startAngle}
            endAngle={props.endAngle}
            midAngle={props.midAngle}
          />
        }
      >
        <path
          class="butterfly-slice-arc"
          d={describeArc(
            0, 0,
            props.innerRadius,
            props.sliceR,
            props.startAngle, props.endAngle, PAD_ANGLE,
          )}
          fill={percentileTierVar(props.percentile as number)}
          fill-opacity="0.85"
          stroke="var(--chart-ring, #e5e5e5)"
          stroke-width="1"
        />
        <SidePercentileLabel
          percentile={props.percentile as number}
          midAngle={props.midAngle}
          innerRadius={props.innerRadius}
          sliceR={props.sliceR}
          hovered={props.hovered}
        />
      </Show>

      <SideOuterLabel
        label={props.label}
        value={props.value}
        midAngle={props.midAngle}
        outerRadius={props.outerRadius}
        labelOffset={props.labelOffset}
        hovered={props.hovered}
        present={present()}
      />
    </g>
  );
}

function MissingWedge(props: {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
}) {
  // Faint stroke-only outline at a small radius — present but visibly empty.
  const r = props.innerRadius + (props.outerRadius - props.innerRadius) * 0.18;
  const pos = polarToCartesian(0, 0, r * 0.7, props.midAngle);
  return (
    <>
      <path
        d={describeArc(0, 0, props.innerRadius, r, props.startAngle, props.endAngle, PAD_ANGLE)}
        class="butterfly-missing-arc"
      />
      <text x={pos.x} y={pos.y + 3} text-anchor="middle" class="butterfly-missing-mark">
        —
      </text>
    </>
  );
}

function SidePercentileLabel(props: {
  percentile: number;
  midAngle: number;
  innerRadius: number;
  sliceR: number;
  hovered: boolean;
}) {
  const labelRadius = () => props.innerRadius + (props.sliceR - props.innerRadius) * 0.6;
  const pos = () => polarToCartesian(0, 0, labelRadius(), props.midAngle);
  return (
    <Show when={props.percentile >= 20}>
      <text
        x={pos().x}
        y={pos().y + 3}
        text-anchor="middle"
        class="butterfly-percentile"
        classList={{ 'is-hovered': props.hovered }}
      >
        {Math.round(props.percentile)}
      </text>
    </Show>
  );
}

function SideOuterLabel(props: {
  label: string;
  value: number | string | null;
  midAngle: number;
  outerRadius: number;
  labelOffset: number;
  hovered: boolean;
  present: boolean;
}) {
  const pos = () =>
    polarToCartesian(
      0, 0,
      props.outerRadius + props.labelOffset + (props.hovered ? HOVER_LABEL_BOOST : 0),
      props.midAngle,
    );
  const anchor = () => textAnchor(pos().x);
  return (
    <>
      <text
        x={pos().x}
        y={pos().y - 6}
        text-anchor={anchor()}
        class="butterfly-stat-label"
        classList={{ 'is-hovered': props.hovered, 'is-missing': !props.present }}
      >
        {props.label}
      </text>
      <text
        x={pos().x}
        y={pos().y + 8}
        text-anchor={anchor()}
        class="butterfly-stat-value"
        classList={{ 'is-hovered': props.hovered, 'is-missing': !props.present }}
      >
        {props.value === null || props.value === undefined ? '—' : String(props.value)}
      </text>
    </>
  );
}

export default ButterflyChart;
