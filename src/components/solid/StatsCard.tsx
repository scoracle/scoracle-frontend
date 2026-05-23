/**
 * StatsCard — Unified player/team stats tab (Solid.js)
 *
 * One-chart-per-card layout (Phase D, refined 2026-05-20). Each of the
 * 5 chart-slot categories (Attack / Possession / Defense / Discipline /
 * Setpiece) with >=2 valid percentiles renders as its OWN locked Shell,
 * with a single pizza chart centered inside. Categories with no data
 * are skipped — no empty cards, no half-filled cards.
 *
 * Each card is a canonical 19:11 Shell. The chart is sized (360×360)
 * to let it express itself; the Shell grows slightly past canonical
 * 348px tall to accommodate per its canonical-with-growth contract.
 *
 * Outer container is a borderless `<section>` (not a Shell). The rate
 * + scope toggles compose into a single `.stats-toolbar` strip above
 * the card stack.
 */

import { createSignal, createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStats, type StatsResponse } from "../../lib/data/stats.server";
import Shell from "./Shell";
import {
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  pickPercentiles,
  pickCohortPosition,
  hasScopedPercentiles,
  getStatLabel,
  type Category,
} from "../../lib/utils/stats-categorizer";
import { getPositionGroup } from "../../lib/utils/position-groups";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import NavStrip from "./NavStrip";
import Skeleton from "./Skeleton";
import { tierColor } from "../../lib/utils/tier-color";
import "./StatsCard.css";

/* Chart sized to fit comfortably inside the portrait Shell's content
 * area (480 - 48 padding = 432 wide). viewBox is padded past the
 * label-extent radius so even the widest stat labels stay inside the
 * SVG box and the chart reads as horizontally centered. */
const CHART_OPTS = { width: 400, height: 360, outerRadius: 130, labelOffset: 22 };

/* The backend ships the player's raw position (e.g. "WR", "DE") inside
 * percentile_metadata.position_group — same value used to partition the
 * percentile buckets. We normalize it through getPositionGroup so an
 * "OLB" rolls up to "linebacker" alongside "ILB" / "MLB". */
function resolvePositionGroup(
  data: StatsResponse | null | undefined,
  sport: string,
): string | undefined {
  const rawPosition =
    data?.percentile_metadata?.position_group ??
    data?.scoped_percentile_metadata?.position_group ??
    null;
  return getPositionGroup(sport, rawPosition);
}

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const stats: PizzaChartStat[] = [];
  for (const stat of category.stats) {
    if (stat.percentile !== undefined && stat.percentile !== null) {
      stats.push({
        key: stat.key,
        label: getStatLabel(stat.key),
        value: stat.value ?? "-",
        percentile: stat.percentile,
        categoryId: category.id,
      });
    }
  }
  return stats;
}

interface Slot {
  category: Category;
  chartStats: PizzaChartStat[];
}

function ChartCell(props: Slot & { cohort?: string | null }) {
  const overallScore = () => {
    let sum = 0;
    for (const s of props.chartStats) sum += s.percentile;
    return Math.round(sum / props.chartStats.length);
  };
  return (
    <div class="stats-cell">
      <p class="category-chart-label">{props.category.label}</p>
      <Show when={props.cohort}>
        <p class="category-chart-cohort">Compared to {props.cohort}s</p>
      </Show>
      <div class="stats-pizza-chart">
        <PizzaChart stats={props.chartStats} options={CHART_OPTS} intenseHover />
      </div>
      <p class="category-chart-label">
        Overall score:{" "}
        <span style={{ color: tierColor(overallScore()) }}>
          {overallScore()}
        </span>
      </p>
    </div>
  );
}

export default function StatsCard() {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  const data = createAsync(() => getStats(sport, type, id));

  const percentiles = createMemo(() => pickPercentiles(data(), ctx.percentileScope()));

  const cohortPosition = createMemo(() =>
    type === "player" ? pickCohortPosition(data(), ctx.percentileScope()) : null,
  );

  const scopeAvailable = createMemo(() => hasScopedPercentiles(data()));
  const scopeName = createMemo(
    () => data()?.scoped_percentile_metadata?.scope_name ?? "",
  );
  const sportLabel = createMemo(() => sport.toUpperCase());

  const positionGroup = createMemo(() => resolvePositionGroup(data(), sport));

  const slotCategories = createMemo(() => {
    const d = data();
    return d?.stats
      ? categorizeForCharts(d.stats, percentiles(), sport, type, positionGroup())
      : [];
  });

  const rateSlotCategories = createMemo(() => {
    if (type !== "player") return [];
    const d = data();
    return d?.stats ? categorizeRateForCharts(d.stats, percentiles(), sport) : [];
  });

  const rateLabel = createMemo(() => getRateLabel(sport));

  const buildSlots = (cats: Category[]): Slot[] =>
    cats.map((c) => ({ category: c, chartStats: categoryToChartStats(c) }));

  const perGameSlots = createMemo(() => buildSlots(slotCategories()));
  const rateSlots = createMemo(() => buildSlots(rateSlotCategories()));

  const [showRate, setShowRate] = createSignal(false);

  const activeSlots = createMemo(() =>
    showRate() && type === "player" ? rateSlots() : perGameSlots(),
  );

  const hasRateCharts = createMemo(() =>
    rateSlots().some((s) => s.chartStats.length >= 2),
  );

  const hasCharts = () => perGameSlots().some((s) => s.chartStats.length >= 2);

  // Filter out categories that don't have enough data to make a pizza
  // chart (>=2 stats with valid percentiles). Empty slots never become
  // cards.
  const populatedSlots = createMemo(() =>
    activeSlots().filter((s) => s.chartStats.length >= 2),
  );

  return (
    <section class="stats-card" aria-label="Stats">
      <Show when={data()} fallback={<div class="stats-error"><p>Unable to load statistics</p></div>}>
        <Show when={hasCharts()} fallback={<div class="stats-empty"><p>No statistics available</p></div>}>
          <Show when={(type === "player" && hasRateCharts() && rateLabel()) || (scopeAvailable() && scopeName())}>
            <div class="stats-toolbar" role="toolbar" aria-label="Stats controls">
              <Show when={type === "player" && hasRateCharts() && rateLabel()}>
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

          <For each={populatedSlots()}>
            {(slot) => (
              <Shell as="article" aria-label={slot.category.label}>
                <ChartCell category={slot.category} chartStats={slot.chartStats} cohort={cohortPosition()} />
              </Shell>
            )}
          </For>
        </Show>
      </Show>
    </section>
  );
}

export function StatsCardSkeleton() {
  // Skeleton matches the typical player case (4 populated slots → 4
  // cards stacked vertically). 5-slot resolves grow by one card on
  // first activation; everything else matches predictively.
  return (
    <section class="stats-card" aria-label="Stats">
      <div class="stats-toolbar" aria-hidden="true">
        <Skeleton shape="line" width={140} height={20} />
        <Skeleton shape="line" width={140} height={20} />
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
