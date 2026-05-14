/**
 * CompareTab — Side-by-side compare layout.
 *
 * Header row pins two pills to the corners of the card: the primary entity
 * on the upper-left, and the compare search (or, once a selection is made,
 * the compare entity pill) on the upper-right. Below the header, the same
 * 4-slot chart grid renders the primary's stats. When the user picks a
 * comparison entity the slot shrinks each chart to half-width and renders
 * the comparison's chart alongside the primary's — no overlay, no recolor,
 * just two standard pizzas.
 *
 * Uniform tab shape: data + render. Loading skeleton is `CompareTabSkeleton`,
 * wired via TabDef.fallback in StatsCard.
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
import CompareSearch from "./CompareSearch";
import Skeleton from "./Skeleton";
import type { AutocompleteEntity } from "../../lib/types";
import "./StatsTab.css";
import "./CompareTab.css";

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const out: PizzaChartStat[] = [];
  for (const s of category.stats) {
    if (s.percentile !== undefined && s.percentile !== null) {
      out.push({
        key: s.key,
        label: s.label,
        value: s.value ?? "-",
        percentile: s.percentile,
        categoryId: category.id,
      });
    }
  }
  return out;
}

interface ChartSlotProps {
  category: Category;
  chartStats: PizzaChartStat[];
  compareStats: PizzaChartStat[];
  hasCompare: boolean;
}

function ChartSlot(props: ChartSlotProps) {
  const hasChart = () => props.chartStats.length >= 2;
  const compareHasChart = () => props.compareStats.length >= 2;

  return (
    <div class="category-chart" classList={{ "category-chart-empty": !hasChart() }}>
      <p class="category-chart-label">{props.category.label}</p>
      <Show when={hasChart()} fallback={<div class="category-chart-placeholder">No data</div>}>
        <div
          class="stats-pizza-chart"
          classList={{ "stats-pizza-chart-pair": props.hasCompare }}
        >
          <div class="compare-chart-cell">
            <PizzaChart
              stats={props.chartStats}
              intenseHover={props.hasCompare}
              options={{ width: 640, height: 640, outerRadius: 207, labelOffset: 41 }}
            />
          </div>
          <Show when={props.hasCompare}>
            <div class="compare-chart-cell">
              <Show
                when={compareHasChart()}
                fallback={<div class="category-chart-placeholder">No data</div>}
              >
                <PizzaChart
                  stats={props.compareStats}
                  intenseHover
                  options={{ width: 640, height: 640, outerRadius: 207, labelOffset: 41 }}
                />
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export default function CompareTab() {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const type = ctx.type;
  const primaryId = ctx.id;

  const primary = createAsync(() => getStats(sport, type, primaryId));

  const [compared, setCompared] = createSignal<AutocompleteEntity | null>(null);
  const compare = createAsync(() => {
    const c = compared();
    return c ? getStats(sport, type, c.id) : Promise.resolve(null);
  });

  const [showRate, setShowRate] = createSignal(false);
  const rateLabel = createMemo(() => (type === "player" ? getRateLabel(sport) : null));

  const primaryPercentiles = createMemo(() => pickPercentiles(primary(), ctx.percentileScope()));
  const comparePercentiles = createMemo(() => pickPercentiles(compare(), ctx.percentileScope()));

  const scopeAvailable = createMemo(() => hasScopedPercentiles(primary()));
  const scopeName = createMemo(
    () => primary()?.scoped_percentile_metadata?.scope_name ?? "",
  );
  const sportLabel = createMemo(() => sport.toUpperCase());

  const primarySlots = createMemo(() => {
    const d = primary();
    if (!d?.stats) return [];
    return showRate()
      ? categorizeRateForCharts(d.stats, primaryPercentiles(), sport)
      : categorizeForCharts(d.stats, primaryPercentiles(), sport, type);
  });

  const compareSlots = createMemo(() => {
    const d = compare();
    if (!d?.stats) return [];
    return showRate()
      ? categorizeRateForCharts(d.stats, comparePercentiles(), sport)
      : categorizeForCharts(d.stats, comparePercentiles(), sport, type);
  });

  const hasRateData = createMemo(() => {
    const d = primary();
    if (!d?.stats || type !== "player") return false;
    return categorizeRateForCharts(d.stats, primaryPercentiles(), sport)
      .some((c) => categoryToChartStats(c).length >= 2);
  });

  const slotPairs = createMemo(() => {
    const p = primarySlots();
    const c = compared() ? compareSlots() : [];
    return p.map((cat, i) => ({
      category: cat,
      chartStats: categoryToChartStats(cat),
      compareStats: c[i] ? categoryToChartStats(c[i]) : [],
    }));
  });

  const primaryName = createMemo(() => {
    const d = primary();
    if (d) return d.name || `${d.first_name || ""} ${d.last_name || ""}`.trim() || "";
    return "";
  });

  const hasCompare = createMemo(() => compared() !== null);

  return (
    <div class="compare-tab">
      <Show when={primary()} fallback={<div class="stats-error"><p>Unable to load statistics</p></div>}>
        <Show
          when={slotPairs().some((p) => p.chartStats.length >= 2)}
          fallback={<div class="stats-empty"><p>No statistics available</p></div>}
        >
          <Show when={type === "player" && hasRateData() && rateLabel()}>
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

          <div class="compare-header">
            <div class="compare-header-slot compare-header-primary">
              <Show when={primaryName()}>
                <div class="compare-pill compare-pill-primary">
                  <span class="compare-pill-name">{primaryName()}</span>
                </div>
              </Show>
            </div>
            <div class="compare-header-slot compare-header-secondary">
              <CompareSearch
                sport={sport}
                entityType={type}
                excludeId={primaryId}
                selected={compared()}
                onSelect={setCompared}
              />
            </div>
          </div>

          <div class="stats-charts-container stats-charts-grid">
            <For each={slotPairs()}>
              {(p) => (
                <ChartSlot
                  category={p.category}
                  chartStats={p.chartStats}
                  compareStats={p.compareStats}
                  hasCompare={hasCompare()}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}

export function CompareTabSkeleton() {
  return (
    <div class="stats-charts-container">
      <div class="chart-skeleton">
        <Skeleton shape="circle" width={180} height={180} />
      </div>
    </div>
  );
}
