/**
 * StatsTab — Unified player/team stats tab (Solid.js island)
 *
 * Renders stats pizza charts, box scores, form badges, and home/away
 * breakdowns. The `type` prop controls which data source is used and
 * which sections appear (rate toggle for player, form + home/away for team).
 *
 * Loads reactively when the tab becomes active via the isActive accessor.
 * PizzaChart is used directly as a Solid component.
 */

import { createSignal, createMemo, createEffect, createResource, Show, For } from 'solid-js';

import { swrFetch, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import { statsUrl, unwrapEntityPayload } from '../../lib/utils/data-sources';
import { useProfile } from '../../contexts/profile';
import { $statsData } from '../../stores/stats';
import {
  categorizeStats,
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  getBoxScoreGroups,
  type Category,
} from '../../lib/utils/stats-categorizer';
import PizzaChart, { type PizzaChartStat } from './PizzaChart';
import './StatsTab.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatsTabProps {
  active: () => boolean;
}

interface StatsResponse {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  season: number | null;
  stats: Record<string, number | string> | null;
  percentiles: Record<string, number> | null;
}

interface HomeAwayStat {
  key: string;
  abbrev: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePercentiles(
  percentiles: Record<string, number> | Array<{ stat_key: string; percentile: number }> | undefined,
): Record<string, number> {
  if (!percentiles) return {};
  if (Array.isArray(percentiles)) {
    const result: Record<string, number> = {};
    for (const p of percentiles) {
      if (p.stat_key && typeof p.percentile === 'number') {
        result[p.stat_key] = p.percentile;
      }
    }
    return result;
  }
  return percentiles;
}

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const stats: PizzaChartStat[] = [];
  for (const stat of category.stats) {
    if (stat.percentile !== undefined && stat.percentile !== null) {
      stats.push({
        key: stat.key,
        label: stat.label,
        value: stat.value ?? '-',
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
    <div class="category-chart" classList={{ 'category-chart-empty': !hasChart() }}>
      <p class="category-chart-label">{props.category.label}</p>
      <Show when={hasChart()} fallback={
        <div class="category-chart-placeholder">No data</div>
      }>
        <div class="stats-pizza-chart">
          <PizzaChart
            stats={props.chartStats}
            options={{ width: 500, height: 500, outerRadius: 162, labelOffset: 32 }}
          />
        </div>
      </Show>
    </div>
  );
}

function getHomeAwayDefs(sport: string): { home: HomeAwayStat[]; away: HomeAwayStat[] } | null {
  const s = sport.toUpperCase();
  if (s === 'FOOTBALL') {
    return {
      home: [
        { key: 'home_played', abbrev: 'MP' }, { key: 'home_wins', abbrev: 'W' },
        { key: 'home_draws', abbrev: 'D' }, { key: 'home_losses', abbrev: 'L' },
        { key: 'home_goals_for', abbrev: 'GF' }, { key: 'home_goals_against', abbrev: 'GA' },
      ],
      away: [
        { key: 'away_played', abbrev: 'MP' }, { key: 'away_wins', abbrev: 'W' },
        { key: 'away_draws', abbrev: 'D' }, { key: 'away_losses', abbrev: 'L' },
        { key: 'away_goals_for', abbrev: 'GF' }, { key: 'away_goals_against', abbrev: 'GA' },
      ],
    };
  }
  if (s === 'NBA') {
    return {
      home: [{ key: 'home_wins', abbrev: 'W' }, { key: 'home_losses', abbrev: 'L' }],
      away: [{ key: 'away_wins', abbrev: 'W' }, { key: 'away_losses', abbrev: 'L' }],
    };
  }
  if (s === 'NFL') {
    return {
      home: [{ key: 'home_wins', abbrev: 'W' }, { key: 'home_losses', abbrev: 'L' }, { key: 'home_ties', abbrev: 'T' }],
      away: [{ key: 'away_wins', abbrev: 'W' }, { key: 'away_losses', abbrev: 'L' }, { key: 'away_ties', abbrev: 'T' }],
    };
  }
  return null;
}

function parseFormBadges(form: string): Array<{ char: string; cls: string; title: string }> {
  return form
    .split('')
    .filter(c => 'WDLwdl'.includes(c))
    .slice(-5)
    .map(c => {
      const u = c.toUpperCase();
      if (u === 'W') return { char: 'W', cls: 'win', title: 'Win' };
      if (u === 'D') return { char: 'D', cls: 'draw', title: 'Draw' };
      return { char: 'L', cls: 'loss', title: 'Loss' };
    });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StatsTab(props: StatsTabProps) {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  // ── Activation ─────────────────────────────────────────────────────────

  // One-shot latch: stays true once `props.active` has been true at any point.
  const shouldLoad = createMemo<boolean>(prev => prev || props.active(), false);

  // ── Data fetching ───────────────────────────────────────────────────────

  async function fetchStats(): Promise<StatsResponse | null> {
    const { url, headers } = statsUrl(sport, type, id);
    const result = await swrFetch<Record<string, unknown>>(url, { ...CACHE_PRESETS.stats, headers });
    const data = unwrapEntityPayload<StatsResponse>(result.data) ?? result.data as unknown as StatsResponse;
    return (data?.stats) ? data : null;
  }

  const [data] = createResource(shouldLoad, fetchStats);

  // ── Derived data ────────────────────────────────────────────────────────

  const percentiles = createMemo(() => {
    const d = data();
    return d ? normalizePercentiles(d.percentiles ?? undefined) : {};
  });

  const categories = createMemo(() => {
    const d = data();
    return d?.stats ? categorizeStats(d.stats, percentiles(), sport, type) : [];
  });

  const boxScoreGroups = createMemo(() => {
    const d = data();
    return d?.stats ? getBoxScoreGroups(d.stats, sport, type) : [];
  });

  // 4-slot chart categories (attack / possession / defense / discipline)
  const slotCategories = createMemo(() => {
    const d = data();
    return d?.stats ? categorizeForCharts(d.stats, percentiles(), sport, type) : [];
  });

  // Player-only: rate chart slots (per-36 / per-90)
  const rateSlotCategories = createMemo(() => {
    if (type !== 'player') return [];
    const d = data();
    return d?.stats ? categorizeRateForCharts(d.stats, percentiles(), sport) : [];
  });

  const rateLabel = createMemo(() => getRateLabel(sport));

  // Team-only: form string and home/away
  const formString = createMemo(() => {
    if (type !== 'team') return '';
    const d = data();
    return d?.stats?.form ? String(d.stats.form) : '';
  });

  const homeAwayData = createMemo(() => {
    if (type !== 'team') return null;
    const d = data();
    if (!d?.stats) return null;
    const defs = getHomeAwayDefs(sport);
    if (!defs) return null;
    const stats = d.stats;
    const hasHome = defs.home.some(s => stats[s.key] !== undefined && stats[s.key] !== null);
    const hasAway = defs.away.some(s => stats[s.key] !== undefined && stats[s.key] !== null);
    if (!hasHome && !hasAway) return null;
    return { defs, stats };
  });

  // Chart stats per slot — always 4 entries in fixed order.
  // Slots with <2 percentile stats render a "Not enough data" placeholder.
  const chartCategories = createMemo(() =>
    slotCategories().map(cat => ({ category: cat, chartStats: categoryToChartStats(cat) })),
  );

  const rateChartCategories = createMemo(() =>
    rateSlotCategories().map(cat => ({ category: cat, chartStats: categoryToChartStats(cat) })),
  );

  // ── Rate toggle (player only) ──────────────────────────────────────────

  const [showRate, setShowRate] = createSignal(false);
  const hasRateCharts = createMemo(() =>
    rateChartCategories().some(c => c.chartStats.length >= 2),
  );

  // Flip height management
  let flipContainerRef: HTMLDivElement | undefined;
  let frontRef: HTMLDivElement | undefined;
  let backRef: HTMLDivElement | undefined;

  createEffect(() => {
    const isRate = showRate();
    if (flipContainerRef && frontRef && backRef) {
      const activeEl = isRate ? backRef : frontRef;
      flipContainerRef.style.minHeight = `${activeEl.scrollHeight}px`;
    }
  });

  // ── Publish stats data ─────────────────────────────────────────────────

  createEffect(() => {
    const d = data();
    if (!d) return;

    const entityName = d.name
      || `${d.first_name || ''} ${d.last_name || ''}`.trim()
      || '';

    const statsPayload = {
      season: d.season,
      entity: { id: String(d.id), name: entityName, type },
      categories: categories(),
      boxScoreGroups: boxScoreGroups(),
      form: formString(),
    };

    $statsData.set(statsPayload);
  });

  // ── Render helpers ─────────────────────────────────────────────────────

  const hasData = () => categories().length > 0 || boxScoreGroups().length > 0;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Loading */}
      <Show when={shouldLoad() && !data.loading} fallback={
        <>
          <div class="stats-charts-container">
            <div class="chart-skeleton">
              <div class="chart-skeleton-circle" />
            </div>
          </div>
          <div class="stats-body">
            <div class="stats-loading">
              <div class="box-score-skeleton">
                <div class="skeleton-row-header" />
                <div class="skeleton-row-cells">
                  <div class="skeleton-cell" /><div class="skeleton-cell" />
                  <div class="skeleton-cell" /><div class="skeleton-cell" />
                  <div class="skeleton-cell" />
                </div>
              </div>
            </div>
          </div>
        </>
      }>
        {/* Error */}
        <Show when={data()} fallback={
          <div class="stats-error"><p>Unable to load statistics</p></div>
        }>
          {/* Empty */}
          <Show when={hasData()} fallback={
            <div class="stats-empty"><p>No statistics available</p></div>
          }>
            {/* ── Content ──────────────────────────────────────────── */}

            {/* Rate toggle (player only) */}
            <Show when={type === 'player' && hasRateCharts() && rateLabel()}>
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

            {/* Charts — fixed 2x2 grid (attack / possession / defense / discipline) */}
            <Show when={chartCategories().some(c => c.chartStats.length >= 2)}>
              <Show when={type === 'player' && hasRateCharts()} fallback={
                <div class="stats-charts-container stats-charts-grid">
                  <For each={chartCategories()}>
                    {(c) => <ChartSlot category={c.category} chartStats={c.chartStats} />}
                  </For>
                </div>
              }>
                <div class="charts-flip-container" ref={flipContainerRef}>
                  <div class="charts-flip-inner" classList={{ flipped: showRate() }}>
                    <div class="charts-flip-front" ref={frontRef}>
                      <div class="stats-charts-container stats-charts-grid">
                        <For each={chartCategories()}>
                          {(c) => <ChartSlot category={c.category} chartStats={c.chartStats} />}
                        </For>
                      </div>
                    </div>
                    <div class="charts-flip-back" ref={backRef}>
                      <div class="stats-charts-container stats-charts-grid">
                        <For each={rateChartCategories()}>
                          {(c) => <ChartSlot category={c.category} chartStats={c.chartStats} />}
                        </For>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>
            </Show>

            {/* Box Score */}
            <Show when={boxScoreGroups().length > 0}>
              <div class="stats-body">
                <div class="stats-box-score">
                  <For each={boxScoreGroups()}>
                    {(group) => (
                      <div class="box-score-group">
                        <p class="group-label">{group.label}</p>
                        <div class="box-score-row">
                          <For each={group.stats}>
                            {(stat) => (
                              <div class="stat-cell">
                                <span class="stat-abbrev">{stat.abbrev}</span>
                                <span class="stat-value">{String(stat.value)}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>

                {/* Home/Away breakdown (team only) */}
                <Show when={homeAwayData()}>
                  {(haData) => (
                    <details class="home-away-section">
                      <summary class="home-away-summary">Home/Away Breakdown</summary>
                      <div class="home-away-content">
                        <For each={[
                          { label: 'Home', defs: haData().defs.home },
                          { label: 'Away', defs: haData().defs.away },
                        ]}>
                          {(row) => {
                            const cells = () => row.defs.filter(
                              s => haData().stats[s.key] !== undefined && haData().stats[s.key] !== null,
                            );
                            return (
                              <Show when={cells().length > 0}>
                                <div class="split-row">
                                  <span class="split-label">{row.label}</span>
                                  <div class="split-stats">
                                    <For each={cells()}>
                                      {(s) => (
                                        <div class="split-stat">
                                          <span class="split-stat-abbrev">{s.abbrev}</span>
                                          <span class="split-stat-value">{String(haData().stats[s.key])}</span>
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </div>
                              </Show>
                            );
                          }}
                        </For>
                      </div>
                    </details>
                  )}
                </Show>
              </div>
            </Show>

            {/* Form / Momentum strip (team only) */}
            <Show when={formString()}>
              {(form) => {
                const badges = () => parseFormBadges(form());
                return (
                  <Show when={badges().length > 0}>
                    <div class="momentum-section">
                      <p class="momentum-label">Momentum</p>
                      <div class="form-display">
                        <For each={badges()}>
                          {(b) => (
                            <span class={`form-badge ${b.cls}`} title={b.title}>{b.char}</span>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                );
              }}
            </Show>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
