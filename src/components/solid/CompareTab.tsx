/**
 * CompareTab — Stats charts with an inline compare search above them.
 *
 * On activation: fetches the primary entity's stats and renders the same
 * 4-slot chart grid as StatsTab. A `<CompareSearch>` lives at the top of
 * the tab. When the user picks a same-sport, same-type entity, its stats
 * are fetched and overlaid on each chart as the gray-outline comparison
 * series. Clearing the selection drops the overlay; the charts stay put.
 */

import { Suspense, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { createAsync } from '@solidjs/router';

import { useProfile } from '../../contexts/profile';
import { getStats } from '../../lib/data/stats.server';
import {
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  normalizePercentiles,
  type Category,
} from '../../lib/utils/stats-categorizer';
import PizzaChart, { type PizzaChartStat, type ComparisonEntityData } from './PizzaChart';
import CompareSearch from './CompareSearch';
import Skeleton from './Skeleton';
import type { AutocompleteEntity } from '../../lib/types';
import './StatsTab.css';
import './CompareTab.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const out: PizzaChartStat[] = [];
  for (const s of category.stats) {
    if (s.percentile !== undefined && s.percentile !== null) {
      out.push({
        key: s.key,
        label: s.label,
        value: s.value ?? '-',
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
  compareName: string;
}

function ChartSlot(props: ChartSlotProps) {
  const hasChart = () => props.chartStats.length >= 2;
  const comparison = (): ComparisonEntityData | null => {
    if (!props.compareName || props.compareStats.length === 0) return null;
    return { name: props.compareName, stats: props.compareStats };
  };
  return (
    <div class="category-chart" classList={{ 'category-chart-empty': !hasChart() }}>
      <p class="category-chart-label">{props.category.label}</p>
      <Show when={hasChart()} fallback={
        <div class="category-chart-placeholder">No data</div>
      }>
        <div class="stats-pizza-chart">
          <PizzaChart
            stats={props.chartStats}
            comparison={comparison()}
            options={{ width: 500, height: 500, outerRadius: 162, labelOffset: 32 }}
          />
        </div>
      </Show>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompareTab() {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const type = ctx.type;
  const primaryId = ctx.id;

  // ── Primary stats — same getStats query as StatsTab; query() dedupes
  //    so this hits the cache once StatsTab has resolved (or vice versa). ──
  const primary = createAsync(() => getStats(sport, type, primaryId));

  // ── Compare selection ──────────────────────────────────────────────────
  // The createAsync fetcher tracks `compared()` — when the user selects a
  // new entity, the fetcher re-runs; when they clear, it resolves to null.

  const [compared, setCompared] = createSignal<AutocompleteEntity | null>(null);
  const compare = createAsync(() => {
    const c = compared();
    return c ? getStats(sport, type, c.id) : Promise.resolve(null);
  });

  function handleCompareChange(entity: AutocompleteEntity | null) {
    setCompared(entity);
  }

  // ── Rate toggle ────────────────────────────────────────────────────────

  const [showRate, setShowRate] = createSignal(false);
  const rateLabel = createMemo(() => type === 'player' ? getRateLabel(sport) : null);

  // ── Slot memos ─────────────────────────────────────────────────────────

  const primaryPercentiles = createMemo(() => {
    const d = primary();
    return d ? normalizePercentiles(d.percentiles) : {};
  });

  const comparePercentiles = createMemo(() => {
    const d = compare();
    return d ? normalizePercentiles(d.percentiles) : {};
  });

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
    if (!d?.stats || type !== 'player') return false;
    return categorizeRateForCharts(d.stats, primaryPercentiles(), sport)
      .some(c => categoryToChartStats(c).length >= 2);
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

  const compareName = createMemo(() => {
    if (!compared()) return '';
    const d = compare();
    if (d) return d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || '';
    return compared()?.name || '';
  });

  // `overflow: hidden` is only needed while the slide-in animation runs —
  // after that, dropping it lets the search dropdown render over the chart.
  const [animatingIn, setAnimatingIn] = createSignal(true);
  onMount(() => {
    const t = setTimeout(() => setAnimatingIn(false), 360);
    return () => clearTimeout(t);
  });

  return (
    <div class="compare-tab">
      <div class="compare-tab-search" classList={{ animating: animatingIn() }}>
        <CompareSearch
          sport={sport}
          entityType={type}
          excludeId={primaryId}
          selected={compared()}
          onSelect={handleCompareChange}
        />
      </div>

      {/* Loading skeleton — only the chart area, search bar stays visible */}
      <Suspense fallback={
        <div class="stats-charts-container">
          <div class="chart-skeleton">
            <Skeleton shape="circle" width={180} height={180} />
          </div>
        </div>
      }>
        <Show when={primary()} fallback={
          <div class="stats-error"><p>Unable to load statistics</p></div>
        }>
          <Show when={slotPairs().some(p => p.chartStats.length >= 2)} fallback={
            <div class="stats-empty"><p>No statistics available</p></div>
          }>
            {/* Rate toggle (player only, when applicable) */}
            <Show when={type === 'player' && hasRateData() && rateLabel()}>
              <div class="rate-toggle">
                <button
                  class="rate-toggle-btn"
                  classList={{ active: !showRate() }}
                  onClick={() => setShowRate(false)}
                >
                  Per Game
                </button>
                <button
                  class="rate-toggle-btn"
                  classList={{ active: showRate() }}
                  onClick={() => setShowRate(true)}
                >
                  {rateLabel()}
                </button>
              </div>
            </Show>

            <div class="stats-charts-container stats-charts-grid">
              <For each={slotPairs()}>
                {(p) => (
                  <ChartSlot
                    category={p.category}
                    chartStats={p.chartStats}
                    compareStats={p.compareStats}
                    compareName={compareName()}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Suspense>
    </div>
  );
}
