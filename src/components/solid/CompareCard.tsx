/**
 * CompareCard — Side-by-side compare layout (Phase D mirror).
 *
 * One-chart-per-card layout (refined 2026-05-20). Each chart-slot
 * category with valid primary data renders as its own locked Shell.
 * Inside each Shell, the primary entity's pizza chart sits on top and
 * the compare entity's pizza chart stacks underneath (when a compare
 * entity is picked).
 *
 * Header row pins two pills above the cards: the primary entity name
 * on the left, the compare search / selected entity on the right.
 *
 * Outer is a borderless `<section>`; the inner Shells carry the chrome.
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
  getStatLabel,
  type Category,
} from "../../lib/utils/stats-categorizer";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import CompareSearch from "./CompareSearch";
import NavStrip from "./NavStrip";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import type { AutocompleteEntity } from "../../lib/types";
import "./StatsCard.css";
import "./CompareCard.css";

const CHART_OPTS = { width: 400, height: 360, outerRadius: 130, labelOffset: 22 };

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const out: PizzaChartStat[] = [];
  for (const s of category.stats) {
    if (s.percentile !== undefined && s.percentile !== null) {
      out.push({
        key: s.key,
        label: getStatLabel(s.key),
        value: s.value ?? "-",
        percentile: s.percentile,
        categoryId: category.id,
      });
    }
  }
  return out;
}

interface ChartCellProps {
  category: Category;
  chartStats: PizzaChartStat[];
  compareStats: PizzaChartStat[];
  hasCompare: boolean;
}

function ChartCell(props: ChartCellProps) {
  const compareHasChart = () => props.compareStats.length >= 2;

  return (
    <div class="stats-cell">
      <p class="category-chart-label">{props.category.label}</p>
      <div class="compare-chart-pair">
        <div class="compare-chart-cell">
          <PizzaChart stats={props.chartStats} intenseHover options={CHART_OPTS} />
        </div>
        <Show when={props.hasCompare}>
          <div class="compare-chart-cell">
            <Show
              when={compareHasChart()}
              fallback={<div class="category-chart-placeholder">No data</div>}
            >
              <PizzaChart stats={props.compareStats} intenseHover options={CHART_OPTS} />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

interface Slot {
  category: Category;
  chartStats: PizzaChartStat[];
  compareStats: PizzaChartStat[];
}

export default function CompareCard() {
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

  const slotData = createMemo<Slot[]>(() => {
    const p = primarySlots();
    const c = compared() ? compareSlots() : [];
    return p.map((cat, i) => ({
      category: cat,
      chartStats: categoryToChartStats(cat),
      compareStats: c[i] ? categoryToChartStats(c[i]) : [],
    }));
  });

  // Skip categories where the PRIMARY has no chart-able data. Compare
  // entity may still be missing data per-category — that's rendered
  // inline as the second cell's "No data" placeholder.
  const populatedSlots = createMemo(() =>
    slotData().filter((s) => s.chartStats.length >= 2),
  );

  const primaryName = createMemo(() => {
    const d = primary();
    if (d) return d.name || `${d.first_name || ""} ${d.last_name || ""}`.trim() || "";
    return "";
  });

  const hasCompare = createMemo(() => compared() !== null);

  const hasCharts = () => slotData().some((s) => s.chartStats.length >= 2);

  return (
    <section class="compare-card" aria-label="Compare">
      <Show when={primary()} fallback={<div class="stats-error"><p>Unable to load statistics</p></div>}>
        <Show
          when={hasCharts()}
          fallback={<div class="stats-empty"><p>No statistics available</p></div>}
        >
          <Show when={(type === "player" && hasRateData() && rateLabel()) || (scopeAvailable() && scopeName())}>
            <div class="stats-toolbar" role="toolbar" aria-label="Stats controls">
              <Show when={type === "player" && hasRateData() && rateLabel()}>
                <NavStrip
                  inline
                  ariaLabel="Rate"
                  active={showRate() ? "rate" : "per-game"}
                  onSelect={(id) => setShowRate(id === "rate")}
                  items={[
                    { id: "per-game", label: "Per Game" },
                    { id: "rate", label: rateLabel() ?? "" },
                  ]}
                />
              </Show>
              <Show when={scopeAvailable() && scopeName()}>
                <NavStrip
                  inline
                  ariaLabel="Scope"
                  active={ctx.percentileScope()}
                  onSelect={(id) => ctx.setPercentileScope(id as "all" | "scoped")}
                  items={[
                    { id: "all", label: `All ${sportLabel()}` },
                    { id: "scoped", label: scopeName() },
                  ]}
                />
              </Show>
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

          <For each={populatedSlots()}>
            {(slot) => (
              <Shell as="article" aria-label={slot.category.label}>
                <ChartCell
                  category={slot.category}
                  chartStats={slot.chartStats}
                  compareStats={slot.compareStats}
                  hasCompare={hasCompare()}
                />
              </Shell>
            )}
          </For>
        </Show>
      </Show>
    </section>
  );
}

export function CompareCardSkeleton() {
  // Skeleton matches the typical player case: header row + 4 cards.
  return (
    <section class="compare-card" aria-label="Compare">
      <div class="card-loading">
        <Skeleton shape="line" width={320} height={40} />
      </div>
      <For each={[1, 2, 3, 4]}>
        {() => (
          <Shell as="article" aria-label="Stats slot">
            <div class="stats-cell">
              <Skeleton shape="line" width={80} height={12} />
              <Skeleton shape="circle" width={300} height={300} />
            </div>
          </Shell>
        )}
      </For>
    </section>
  );
}
