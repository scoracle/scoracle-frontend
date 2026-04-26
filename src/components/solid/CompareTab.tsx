/**
 * CompareTab — Stats charts with an inline compare search above them.
 *
 * On activation: fetches the primary entity's stats and renders the same
 * 4-slot chart grid as StatsTab. A `<CompareSearch>` lives at the top of
 * the tab. When the user picks a same-sport, same-type entity, its stats
 * are fetched and overlaid on each chart as the gray-outline comparison
 * series. Clearing the selection drops the overlay; the charts stay put.
 */

import { createSignal, createMemo, createEffect, createResource, onMount, Show, For } from 'solid-js';

import { swrFetch, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import { entityUrl, unwrapEntityPayload } from '../../lib/utils/data-sources';
import { useProfile } from '../../contexts/profile';
import {
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  type Category,
} from '../../lib/utils/stats-categorizer';
import PizzaChart, { type PizzaChartStat, type ComparisonEntityData } from './PizzaChart';
import CompareSearch from './CompareSearch';
import type { AutocompleteEntity } from '../../lib/types';
import './StatsTab.css';
import './CompareTab.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatsResponse {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  stats: Record<string, number | string> | null;
  percentiles: Record<string, number> | Array<{ stat_key: string; percentile: number }> | null;
}

interface CompareTabProps {
  active: () => boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePercentiles(
  percentiles: StatsResponse['percentiles'],
): Record<string, number> {
  if (!percentiles) return {};
  if (Array.isArray(percentiles)) {
    const result: Record<string, number> = {};
    for (const p of percentiles) {
      if (p.stat_key && typeof p.percentile === 'number') result[p.stat_key] = p.percentile;
    }
    return result;
  }
  return percentiles;
}

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

export default function CompareTab(props: CompareTabProps) {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const type = ctx.type;
  const primaryId = ctx.id;

  const isActive = () => props.active();
  const [shouldLoad, setShouldLoad] = createSignal(false);
  createEffect(() => {
    if (isActive() && !shouldLoad()) setShouldLoad(true);
  });

  // ── Stats fetcher ──────────────────────────────────────────────────────

  async function fetchStats(id: string): Promise<StatsResponse | null> {
    const { url, headers } = entityUrl(sport, type, id);
    const res = await swrFetch<Record<string, unknown>>(url, { ...CACHE_PRESETS.stats, headers });
    const out = unwrapEntityPayload<StatsResponse>(res.data) ?? res.data as unknown as StatsResponse;
    return out?.stats ? out : null;
  }

  const [primary] = createResource(shouldLoad, () => fetchStats(primaryId));

  // ── Compare selection ──────────────────────────────────────────────────
  // `mutate` lets us synchronously drop the previous resource value when the
  // user clears the selection — otherwise createResource holds onto its last
  // result indefinitely and the overlay would linger.

  const [compared, setCompared] = createSignal<AutocompleteEntity | null>(null);
  const [compare, { mutate: mutateCompare }] = createResource(
    compared,
    (entity) => fetchStats(entity.id),
  );

  function handleCompareChange(entity: AutocompleteEntity | null) {
    if (entity) {
      setCompared(entity);
    } else {
      setCompared(null);
      mutateCompare(null);
    }
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
      <Show when={shouldLoad() && !primary.loading} fallback={
        <div class="stats-charts-container">
          <div class="chart-skeleton">
            <div class="chart-skeleton-circle" />
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
      </Show>
    </div>
  );
}
