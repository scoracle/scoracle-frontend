/**
 * Static mirror-halves comparison. Both sides share a percentile scale,
 * stat order and label positions, using the standard pizza's wedges and
 * fitted raw tallies. Missing data is an em dash beside the stat name.
 */
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { placeWideLabelsVertical, polarToCartesian, sliceMidAngles } from '../../lib/charts/arc-math';
import { outerBlockWidth, solveRadius, type PizzaChartOptions, type PizzaChartStat } from '../../lib/charts/pizza-geometry';
import { pizzaLabelRadius } from '../../lib/charts/pizza-label-layout';
import PizzaSlice from './PizzaSlice';
import './ButterflyChart.css';

export interface ButterflyStat {
  key: string;
  label: string;
  leftValue: number | string | null;
  leftPercentile: number | null;
  rightValue: number | string | null;
  rightPercentile: number | null;
}

export type ButterflyChartOptions = PizzaChartOptions;

interface ButterflyChartProps {
  stats: ButterflyStat[];
  options?: ButterflyChartOptions;
}

const DEFAULTS = { width: 360, height: 360, innerRadius: 0, labelOffset: 14 };

/** Reserve enough room for both halves, keeping paired names aligned. */
function pairLabel(stat: ButterflyStat): PizzaChartStat {
  const left = String(stat.leftValue ?? '—');
  const right = String(stat.rightValue ?? '—');
  return {
    key: stat.key,
    label: stat.label,
    value: left.length >= right.length ? left : right,
    percentile: Math.max(stat.leftPercentile ?? 0, stat.rightPercentile ?? 0),
  };
}

export default function ButterflyChart(props: ButterflyChartProps) {
  const opts = () => ({ ...DEFAULTS, ...props.options });
  const [box, setBox] = createSignal<{ w: number; h: number } | null>(null);
  let hostEl: HTMLDivElement | undefined;
  onMount(() => {
    if (!hostEl) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 1 || rect.height < 1) return;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setBox((prev) => prev?.w === w && prev.h === h ? prev : { w, h });
    });
    observer.observe(hostEl);
    onCleanup(() => observer.disconnect());
  });
  const width = () => box()?.w ?? opts().width;
  const height = () => box()?.h ?? opts().height;
  const mids = createMemo(() => sliceMidAngles(props.stats.length, Math.PI));
  const step = () => Math.PI / props.stats.length;

  const layout = createMemo(() => {
    const o = opts();
    const m = mids();
    const solve = (stats: ButterflyStat[]) => solveRadius(
      stats.map(pairLabel), m, width() / 2, height() / 2,
      o.innerRadius, o.labelOffset, o.outerRadius, true,
    );
    let stats = placeWideLabelsVertical(props.stats, m, (s) => outerBlockWidth(pairLabel(s)));
    let radius = solve(stats);
    let seed = Math.min(width(), height()) / 2;
    for (let pass = 0; pass < 2; pass++) {
      const byReach = placeWideLabelsVertical(props.stats, m, (s) => {
        const label = pairLabel(s);
        return pizzaLabelRadius(label.percentile, o.innerRadius, seed, o.labelOffset) + outerBlockWidth(label);
      });
      const r = solve(byReach);
      if (r > radius) { stats = byReach; radius = r; }
      if (Math.abs(r - seed) < 0.5) break;
      seed = r;
    }
    return { stats, radius };
  });

  // A half-circle has twice the annotation density of a full pizza. Keep
  // its paired labels clear of one another, using the card's vertical room.
  const labels = createMemo(() => {
    const o = opts();
    const positions = layout().stats.map((stat, i) => polarToCartesian(0, 0,
      pizzaLabelRadius(pairLabel(stat).percentile, o.innerRadius, layout().radius, o.labelOffset), mids()[i]));
    const limit = Math.max(0, height() / 2 - 20);
    const gap = Math.min(30, 2 * limit / Math.max(1, positions.length - 1));
    for (let i = 1; i < positions.length; i++) {
      positions[i].y = Math.max(positions[i].y, positions[i - 1].y + gap);
    }
    if (positions.length && positions[positions.length - 1].y > limit) {
      positions[positions.length - 1].y = limit;
    }
    for (let i = positions.length - 2; i >= 0; i--) {
      positions[i].y = Math.min(positions[i].y, positions[i + 1].y - gap);
    }
    // Center the label stack on the disk after resolving collisions.
    const center = positions.length ? (positions[0].y + positions[positions.length - 1].y) / 2 : 0;
    return positions.map((position) => ({ x: position.x, y: position.y - center }));
  });

  return (
    <div class="pizza-chart-host" ref={hostEl}>
      <Show when={props.stats.length >= 2} fallback={<p class="chart-no-data">Not enough data for chart</p>}>
        <svg
          viewBox={`${-width() / 2} ${-height() / 2} ${width()} ${height()}`}
          class="pizza-chart-svg butterfly-chart-svg"
          role="img"
          aria-label="Butterfly comparison: primary entity on the left, comparison entity on the right. Slice size and color show percentile; numbers show raw values."
        >
          <desc>{props.stats.map((stat) => `${stat.label}: left ${stat.leftPercentile == null ? 'no data' : stat.leftValue ?? '—'}, right ${stat.rightPercentile == null ? 'no data' : stat.rightValue ?? '—'}.`).join(' ')}</desc>
          <line x1="0" y1={-layout().radius} x2="0" y2={layout().radius} class="butterfly-divider" />
          <For each={layout().stats}>
            {(stat, i) => (
              <g class="butterfly-pair">
                <For each={['left', 'right'] as const}>
                  {(side) => {
                    const percentile = () => side === 'left' ? stat.leftPercentile : stat.rightPercentile;
                    const value = () => side === 'left' ? stat.leftValue : stat.rightValue;
                    const start = () => side === 'left'
                      ? -Math.PI / 2 - (i() + 1) * step()
                      : -Math.PI / 2 + i() * step();
                    return (
                      <g class={`butterfly-side butterfly-side-${side}`}>
                        <PizzaSlice
                          stat={{ key: stat.key, label: stat.label,
                            value: percentile() == null ? '—' : value() ?? '—', percentile: percentile() ?? 0 }}
                          startAngle={start()}
                          endAngle={start() + step()}
                          innerRadius={opts().innerRadius}
                          outerRadius={layout().radius}
                          labelOffset={opts().labelOffset}
                          labelPercentile={pairLabel(stat).percentile}
                          labelPosition={{ x: labels()[i()].x * (side === 'left' ? -1 : 1), y: labels()[i()].y }}
                          missing={percentile() == null}
                          outwardLabel
                        />
                      </g>
                    );
                  }}
                </For>
              </g>
            )}
          </For>
        </svg>
      </Show>
    </div>
  );
}
