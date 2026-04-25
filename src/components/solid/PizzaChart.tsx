/**
 * PizzaChart — Solid.js SVG pizza/radar chart for percentile visualization
 *
 * Declarative SVG. Slices are sized by percentile (radius = percentile of
 * the inner-to-outer range), colored by percentile tier (5-level palette
 * via `--percentile-*` CSS variables), with optional comparison overlay
 * for two entities side-by-side.
 *
 * CSS variables (--percentile-elite, --chart-ring, etc.) are referenced
 * directly in SVG fill/stroke attributes, so theme changes are automatic —
 * no refresh() call needed.
 *
 * Usage:
 *   <PizzaChart stats={stats()} />
 *   <PizzaChart stats={primary()} comparison={secondary()} />
 *
 * Note: the legacy `createPizzaChartBridge()` export from the Astro repo
 * (vanilla-JS mount adapter for `StatsComparisonContent.astro`) was dropped
 * in this port — that consumer was the deactivated comparison feature, and
 * the new compare flow runs as a Solid component (CompareTab) so the bridge
 * has no consumers.
 */

import { For, Show } from 'solid-js';
import {
  describeArc,
  sliceRadius,
  truncateLabel,
  percentileTierVar,
  textAnchor,
  polarToCartesian,
} from '../../lib/charts/arc-math';

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
}

export interface ComparisonEntityData {
  name: string;
  stats: PizzaChartStat[];
}

interface PizzaChartProps {
  stats: PizzaChartStat[];
  comparison?: ComparisonEntityData | null;
  options?: PizzaChartOptions;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS = {
  width: 360,
  height: 360,
  innerRadius: 22,
  outerRadius: 120,
  labelOffset: 30,
} as const;

const PAD_ANGLE = 0.02;
const COMPARISON_PAD_ANGLE = 0.03;

// ─── Sub-components ─────────────────────────────────────────────────────────

function SliceLabel(props: {
  stat: PizzaChartStat;
  angle: number;
  outerRadius: number;
  labelOffset: number;
}) {
  const pos = () => polarToCartesian(0, 0, props.outerRadius + props.labelOffset, props.angle);
  const anchor = () => textAnchor(pos().x);

  return (
    <>
      <text
        x={pos().x}
        y={pos().y - 6}
        text-anchor={anchor()}
        fill="var(--chart-label, #1a1a1a)"
        font-size="10px"
        font-weight="500"
      >
        {truncateLabel(props.stat.label, 14)}
      </text>
      <text
        x={pos().x}
        y={pos().y + 8}
        text-anchor={anchor()}
        fill="var(--chart-sublabel, #666666)"
        font-size="9px"
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
  outerRadius: number;
}) {
  const sr = () => sliceRadius(props.percentile, props.innerRadius, props.outerRadius);
  const labelRadius = () => props.innerRadius + (sr() - props.innerRadius) * 0.6;
  const pos = () => polarToCartesian(0, 0, labelRadius(), props.angle);

  return (
    <Show when={props.percentile >= 20}>
      <text
        x={pos().x}
        y={pos().y + 3}
        text-anchor="middle"
        fill="#ffffff"
        font-size="10px"
        font-weight="600"
      >
        {Math.round(props.percentile)}
      </text>
    </Show>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function PizzaChart(props: PizzaChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });
  const w = () => opts().width;
  const h = () => opts().height;
  const inner = () => opts().innerRadius;
  const outer = () => opts().outerRadius;
  const labelOff = () => opts().labelOffset;

  return (
    <Show
      when={props.stats.length >= 2}
      fallback={<p class="chart-no-data">Not enough data for chart</p>}
    >
      <Show
        when={!props.comparison}
        fallback={
          <ComparisonChart
            primary={props.stats}
            secondary={props.comparison!}
            width={w()}
            height={h()}
            innerRadius={inner()}
            outerRadius={outer()}
            labelOffset={labelOff()}
          />
        }
      >
        <SingleChart
          stats={props.stats}
          width={w()}
          height={h()}
          innerRadius={inner()}
          outerRadius={outer()}
          labelOffset={labelOff()}
        />
      </Show>
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
}) {
  const angleStep = () => (2 * Math.PI) / props.stats.length;

  return (
    <svg
      viewBox={`0 0 ${props.width} ${props.height}`}
      preserveAspectRatio="xMidYMid meet"
      class="pizza-chart-svg"
      style={{ width: '100%', 'max-width': `${props.width}px`, height: 'auto' }}
    >
      <g transform={`translate(${props.width / 2}, ${props.height / 2})`}>
        <For each={props.stats}>
          {(stat, i) => {
            const startAngle = () => i() * angleStep() - Math.PI / 2;
            const endAngle = () => startAngle() + angleStep();
            const midAngle = () => (startAngle() + endAngle()) / 2;
            const sr = () => sliceRadius(stat.percentile, props.innerRadius, props.outerRadius);

            return (
              <>
                <path
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
                  outerRadius={props.outerRadius}
                />
              </>
            );
          }}
        </For>

        {/* Center circle */}
        <circle
          r={props.innerRadius - 2}
          fill="var(--bg-card, #ffffff)"
        />
      </g>
    </svg>
  );
}

// ─── Comparison Chart ───────────────────────────────────────────────────────

function ComparisonChart(props: {
  primary: PizzaChartStat[];
  secondary: ComparisonEntityData;
  width: number;
  height: number;
  innerRadius: number;
  outerRadius: number;
  labelOffset: number;
}) {
  // Build unified stat key list from both entities
  const statKeys = () => {
    const keys = new Set<string>();
    props.primary.forEach(s => keys.add(s.key));
    props.secondary.stats.forEach(s => keys.add(s.key));
    return Array.from(keys);
  };

  const primaryMap = () => new Map(props.primary.map(s => [s.key, s]));
  const secondaryMap = () => new Map(props.secondary.stats.map(s => [s.key, s]));
  const angleStep = () => (2 * Math.PI) / statKeys().length;

  return (
    <Show
      when={statKeys().length >= 2}
      fallback={<p class="chart-no-data">Not enough data for comparison chart</p>}
    >
      <svg
        viewBox={`0 0 ${props.width} ${props.height}`}
        preserveAspectRatio="xMidYMid meet"
        class="pizza-chart-svg pizza-chart-comparison"
        style={{ width: '100%', 'max-width': `${props.width}px`, height: 'auto' }}
      >
        <g transform={`translate(${props.width / 2}, ${props.height / 2})`}>
          <For each={statKeys()}>
            {(key, i) => {
              const startAngle = () => i() * angleStep() - Math.PI / 2;
              const endAngle = () => startAngle() + angleStep();
              const midAngle = () => (startAngle() + endAngle()) / 2;
              const pStat = () => primaryMap().get(key);
              const sStat = () => secondaryMap().get(key);

              return (
                <>
                  {/* Primary entity — filled */}
                  <Show when={pStat()}>
                    {(stat) => (
                      <path
                        d={describeArc(
                          0, 0, props.innerRadius,
                          sliceRadius(stat().percentile, props.innerRadius, props.outerRadius),
                          startAngle(), endAngle(), COMPARISON_PAD_ANGLE,
                        )}
                        fill="var(--compare-primary, #2563eb)"
                        fill-opacity="0.7"
                        stroke="var(--compare-primary, #2563eb)"
                        stroke-width="1"
                        class="comparison-slice primary"
                      />
                    )}
                  </Show>

                  {/* Secondary entity — outlined overlay */}
                  <Show when={sStat()}>
                    {(stat) => (
                      <path
                        d={describeArc(
                          0, 0, props.innerRadius,
                          sliceRadius(stat().percentile, props.innerRadius, props.outerRadius),
                          startAngle(), endAngle(), COMPARISON_PAD_ANGLE,
                        )}
                        fill="var(--compare-secondary, #f97316)"
                        fill-opacity="0.3"
                        stroke="var(--compare-secondary, #f97316)"
                        stroke-width="2"
                        stroke-dasharray="4,2"
                        class="comparison-slice secondary"
                      />
                    )}
                  </Show>

                  {/* Labels — render when at least one entity has this stat */}
                  <Show when={pStat() || sStat()}>
                    {(labelStat) => {
                      const pos = () => polarToCartesian(0, 0, props.outerRadius + props.labelOffset, midAngle());
                      const anchor = () => textAnchor(pos().x);

                      return (
                        <>
                          <text
                            x={pos().x}
                            y={pos().y - 6}
                            text-anchor={anchor()}
                            fill="var(--chart-label, #1a1a1a)"
                            font-size="10px"
                            font-weight="500"
                          >
                            {truncateLabel(labelStat().label, 14)}
                          </text>
                          <text
                            x={pos().x}
                            y={pos().y + 8}
                            text-anchor={anchor()}
                            font-size="8px"
                          >
                            <tspan fill="var(--compare-primary, #2563eb)" font-weight="600">
                              {pStat() ? String(pStat()!.value) : '-'}
                            </tspan>
                            <tspan fill="var(--chart-sublabel, #666666)"> / </tspan>
                            <tspan fill="var(--compare-secondary, #f97316)" font-weight="600">
                              {sStat() ? String(sStat()!.value) : '-'}
                            </tspan>
                          </text>
                        </>
                      );
                    }}
                  </Show>
                </>
              );
            }}
          </For>

          {/* Center circle with VS label */}
          <circle r={props.innerRadius - 2} fill="var(--bg-card, #ffffff)" />
          <text
            x="0"
            y="5"
            text-anchor="middle"
            fill="var(--chart-sublabel, #666666)"
            font-size="12px"
            font-weight="700"
          >
            VS
          </text>
        </g>
      </svg>
    </Show>
  );
}

export default PizzaChart;
