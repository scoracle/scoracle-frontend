/**
 * StatsTab — Unified player/team stats tab (Solid.js)
 *
 * Renders stats pizza charts, box scores, form badges, and home/away
 * breakdowns. The active player/team is read from ProfileContext. Data
 * flows from `getStats` via `createAsync` — same query() cache as
 * TraitsTab + CompareTab share.
 *
 * Uniform tab shape: data + render. Loading skeleton is `StatsTabSkeleton`,
 * wired via TabDef.fallback in StatsCard. The rate-toggle (player only)
 * is a simple Show that swaps which chart set renders — no flip card,
 * no refs, no ResizeObserver.
 */

import { createSignal, createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStats } from "../../lib/data/stats.server";
import {
  categorizeStats,
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  getBoxScoreGroups,
  pickPercentiles,
  hasScopedPercentiles,
  type Category,
} from "../../lib/utils/stats-categorizer";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import Skeleton from "./Skeleton";
import "./StatsTab.css";

interface HomeAwayStat {
  key: string;
  abbrev: string;
}

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

function getHomeAwayDefs(sport: string): { home: HomeAwayStat[]; away: HomeAwayStat[] } | null {
  const s = sport.toUpperCase();
  if (s === "FOOTBALL") {
    return {
      home: [
        { key: "home_played", abbrev: "MP" }, { key: "home_wins", abbrev: "W" },
        { key: "home_draws", abbrev: "D" }, { key: "home_losses", abbrev: "L" },
        { key: "home_goals_for", abbrev: "GF" }, { key: "home_goals_against", abbrev: "GA" },
      ],
      away: [
        { key: "away_played", abbrev: "MP" }, { key: "away_wins", abbrev: "W" },
        { key: "away_draws", abbrev: "D" }, { key: "away_losses", abbrev: "L" },
        { key: "away_goals_for", abbrev: "GF" }, { key: "away_goals_against", abbrev: "GA" },
      ],
    };
  }
  if (s === "NBA") {
    return {
      home: [{ key: "home_wins", abbrev: "W" }, { key: "home_losses", abbrev: "L" }],
      away: [{ key: "away_wins", abbrev: "W" }, { key: "away_losses", abbrev: "L" }],
    };
  }
  if (s === "NFL") {
    return {
      home: [{ key: "home_wins", abbrev: "W" }, { key: "home_losses", abbrev: "L" }, { key: "home_ties", abbrev: "T" }],
      away: [{ key: "away_wins", abbrev: "W" }, { key: "away_losses", abbrev: "L" }, { key: "away_ties", abbrev: "T" }],
    };
  }
  return null;
}

function parseFormBadges(form: string): Array<{ char: string; cls: string; title: string }> {
  return form
    .split("")
    .filter((c) => "WDLwdl".includes(c))
    .slice(-5)
    .map((c) => {
      const u = c.toUpperCase();
      if (u === "W") return { char: "W", cls: "win", title: "Win" };
      if (u === "D") return { char: "D", cls: "draw", title: "Draw" };
      return { char: "L", cls: "loss", title: "Loss" };
    });
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

  const categories = createMemo(() => {
    const d = data();
    return d?.stats ? categorizeStats(d.stats, percentiles(), sport, type) : [];
  });

  const boxScoreGroups = createMemo(() => {
    const d = data();
    return d?.stats ? getBoxScoreGroups(d.stats, sport, type) : [];
  });

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

  const formString = createMemo(() => {
    if (type !== "team") return "";
    const d = data();
    return d?.stats?.form ? String(d.stats.form) : "";
  });

  const homeAwayData = createMemo(() => {
    if (type !== "team") return null;
    const d = data();
    if (!d?.stats) return null;
    const defs = getHomeAwayDefs(sport);
    if (!defs) return null;
    const stats = d.stats;
    const hasHome = defs.home.some((s) => stats[s.key] !== undefined && stats[s.key] !== null);
    const hasAway = defs.away.some((s) => stats[s.key] !== undefined && stats[s.key] !== null);
    if (!hasHome && !hasAway) return null;
    return { defs, stats };
  });

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

  const hasData = () => categories().length > 0 || boxScoreGroups().length > 0;

  return (
    <Show when={data()} fallback={<div class="stats-error"><p>Unable to load statistics</p></div>}>
      <Show when={hasData()} fallback={<div class="stats-empty"><p>No statistics available</p></div>}>
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

        <Show when={chartCategories().some((c) => c.chartStats.length >= 2)}>
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

            <Show when={homeAwayData()}>
              {(haData) => (
                <details class="home-away-section">
                  <summary class="home-away-summary">Home/Away Breakdown</summary>
                  <div class="home-away-content">
                    <For each={[
                      { label: "Home", defs: haData().defs.home },
                      { label: "Away", defs: haData().defs.away },
                    ]}>
                      {(row) => {
                        const cells = () => row.defs.filter(
                          (s) => haData().stats[s.key] !== undefined && haData().stats[s.key] !== null,
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
  );
}

export function StatsTabSkeleton() {
  return (
    <>
      <div class="stats-charts-container">
        <div class="chart-skeleton">
          <Skeleton shape="circle" width={180} height={180} />
        </div>
      </div>
      <div class="stats-body">
        <div class="stats-loading">
          <div class="box-score-skeleton">
            <Skeleton shape="line" width={80} height={12} />
            <div class="skeleton-row-cells">
              <Skeleton shape="block" width={48} height={44} />
              <Skeleton shape="block" width={48} height={44} />
              <Skeleton shape="block" width={48} height={44} />
              <Skeleton shape="block" width={48} height={44} />
              <Skeleton shape="block" width={48} height={44} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
