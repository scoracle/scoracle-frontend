/**
 * StatsTab — Unified player/team stats tab (Solid.js)
 *
 * Renders the pizza chart grid for the active player/team. That's it —
 * the chart IS the stats card. Box-score numbers, home/away breakdowns,
 * and the W/L/D momentum strip were all removed 2026-05-14 in favour of
 * the chart-as-canonical-representation rule: every datapoint surfaced
 * here lives on a slice.
 *
 * Data: `getStats` via `createAsync`, sharing the query() cache with
 * TraitsTab + CompareTab. Skeleton: `StatsTabSkeleton`, wired via
 * TabDef.fallback in StatsCard.
 *
 * The rate toggle (player only) flips which chart set renders — no
 * flip card, no refs, no ResizeObserver. The scope toggle (when
 * scoped percentiles exist) flips the percentile reference set.
 */

import { createSignal, createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStats } from "../../lib/data/stats.server";
import {
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  pickPercentiles,
  hasScopedPercentiles,
  type Category,
} from "../../lib/utils/stats-categorizer";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import Skeleton from "./Skeleton";
import "./StatsTab.css";

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const stats: PizzaChartStat[] = [];
  for (const stat of category.stats) {
    if (stat.percentile !== undefined && stat.percentile !== null) {
      stats.push({
        key: stat.key,
        label: stat.label,
        value: stat.value ?? "-",
        percentile: stat.percentile,
        categoryId: category.id,
      });
    }
  }
  return stats;
}

function ChartSlot(props: { category: Category; chartStats: PizzaChartStat[] }) {
  const hasChart = () => props.chartStats.length >= 2;
  return (
    <div class="category-chart" classList={{ "category-chart-empty": !hasChart() }}>
      <p class="category-chart-label">{props.category.label}</p>
      <Show when={hasChart()} fallback={<div class="category-chart-placeholder">No data</div>}>
        <div class="stats-pizza-chart">
          <PizzaChart
            stats={props.chartStats}
            options={{ width: 640, height: 640, outerRadius: 207, labelOffset: 41 }}
          />
        </div>
      </Show>
    </div>
  );
}

export default function StatsTab() {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  const data = createAsync(() => getStats(sport, type, id));

  const percentiles = createMemo(() => pickPercentiles(data(), ctx.percentileScope()));

  const scopeAvailable = createMemo(() => hasScopedPercentiles(data()));
  const scopeName = createMemo(
    () => data()?.scoped_percentile_metadata?.scope_name ?? "",
  );
  const sportLabel = createMemo(() => sport.toUpperCase());

  const slotCategories = createMemo(() => {
    const d = data();
    return d?.stats ? categorizeForCharts(d.stats, percentiles(), sport, type) : [];
  });

  const rateSlotCategories = createMemo(() => {
    if (type !== "player") return [];
    const d = data();
    return d?.stats ? categorizeRateForCharts(d.stats, percentiles(), sport) : [];
  });

  const rateLabel = createMemo(() => getRateLabel(sport));

  const chartCategories = createMemo(() =>
    slotCategories().map((cat) => ({ category: cat, chartStats: categoryToChartStats(cat) })),
  );

  const rateChartCategories = createMemo(() =>
    rateSlotCategories().map((cat) => ({ category: cat, chartStats: categoryToChartStats(cat) })),
  );

  const [showRate, setShowRate] = createSignal(false);
  const hasRateCharts = createMemo(() =>
    rateChartCategories().some((c) => c.chartStats.length >= 2),
  );

  const hasCharts = () => chartCategories().some((c) => c.chartStats.length >= 2);

  return (
    <Show when={data()} fallback={<div class="stats-error"><p>Unable to load statistics</p></div>}>
      <Show when={hasCharts()} fallback={<div class="stats-empty"><p>No statistics available</p></div>}>
        <Show when={type === "player" && hasRateCharts() && rateLabel()}>
          <div class="rate-toggle">
            <button class="rate-toggle-btn" classList={{ active: !showRate() }} onClick={() => setShowRate(false)}>
              Per Game
            </button>
            <button class="rate-toggle-btn" classList={{ active: showRate() }} onClick={() => setShowRate(true)}>
              {rateLabel()}
            </button>
          </div>
        </Show>

        <Show when={scopeAvailable() && scopeName()}>
          <div class="rate-toggle scope-toggle">
            <button
              class="rate-toggle-btn"
              classList={{ active: ctx.percentileScope() === "all" }}
              onClick={() => ctx.setPercentileScope("all")}
            >
              All {sportLabel()}
            </button>
            <button
              class="rate-toggle-btn"
              classList={{ active: ctx.percentileScope() === "scoped" }}
              onClick={() => ctx.setPercentileScope("scoped")}
            >
              {scopeName()}
            </button>
          </div>
        </Show>

        <div class="stats-charts-container stats-charts-grid">
          <Show
            when={showRate() && type === "player" && hasRateCharts()}
            fallback={
              <For each={chartCategories()}>
                {(c) => <ChartSlot category={c.category} chartStats={c.chartStats} />}
              </For>
            }
          >
            <For each={rateChartCategories()}>
              {(c) => <ChartSlot category={c.category} chartStats={c.chartStats} />}
            </For>
          </Show>
        </div>
      </Show>
    </Show>
  );
}

export function StatsTabSkeleton() {
  return (
    <div class="stats-charts-container">
      <div class="chart-skeleton">
        <Skeleton shape="circle" width={180} height={180} />
      </div>
    </div>
  );
}
