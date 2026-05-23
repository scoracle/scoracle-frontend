/**
 * CompareCard — Butterfly (mirror-halves) compare layout.
 *
 * One-chart-per-card layout, one ButterflyChart per category. The
 * primary entity sweeps the LEFT semicircle; the compare entity
 * sweeps the RIGHT semicircle. Each stat appears mirrored, with
 * shared hover state linking the two sides — spatial separation
 * does the attribution work (no overlay muddiness).
 *
 * When no compare entity is picked yet, falls back to a single
 * PizzaChart per category (same look as StatsCard) so the empty
 * state stays calm.
 *
 * The compare entity is persisted in the URL as `?vs=<id>`, so a
 * comparison view is shareable / survives refresh.
 *
 * Per-entity cohort disclaimer ("Compared to {position}s") sits
 * under each pill — two players may be benched against different
 * cohorts on the backend, so this surfaces it explicitly.
 */

import { createSignal, createMemo, createEffect, Show, For } from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStats, type StatsResponse } from "../../lib/data/stats.server";
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
import { entityDataStore } from "../../lib/utils/entity-data-store";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import ButterflyChart, { type ButterflyStat } from "./ButterflyChart";
import CompareSearch from "./CompareSearch";
import NavStrip from "./NavStrip";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import ShareTrigger from "../../lib/share/ShareTrigger";
import type { CardType } from "../../lib/share/categories";
import type { AutocompleteEntity } from "../../lib/types";
import { tierColor } from "../../lib/utils/tier-color";
import "./StatsCard.css";
import "./CompareCard.css";

const CHART_OPTS = { width: 400, height: 360, outerRadius: 130, labelOffset: 22 };

/* Same shape as StatsCard / TraitsCard — pulls raw position out of the
 * stats response's percentile metadata and normalizes it. For NFL
 * compare we collapse to the primary's position so both sides share
 * the same stat universe; comparing a WR to a CB on receiving stats
 * still works, the CB just shows mostly empty rings. */
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

/* Average percentile across a category's stats, rounded. Matches the
 * "Overall score: NN" readout from StatsCard — applied per-entity in the
 * butterfly compare so each side gets its own colored score. */
function overallScore(stats: PizzaChartStat[]): number {
  let sum = 0;
  for (const s of stats) sum += s.percentile;
  return Math.round(sum / stats.length);
}

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

function buildButterflyStats(
  primaryStats: PizzaChartStat[],
  compareStats: PizzaChartStat[],
): ButterflyStat[] {
  const cMap = new Map(compareStats.map((s) => [s.key, s]));
  const seen = new Set<string>();
  const rows: ButterflyStat[] = [];
  for (const p of primaryStats) {
    const c = cMap.get(p.key);
    seen.add(p.key);
    rows.push({
      key: p.key,
      label: p.label,
      leftValue: p.value,
      leftPercentile: p.percentile,
      rightValue: c?.value ?? null,
      rightPercentile: c?.percentile ?? null,
    });
  }
  // Stats the compare entity has but primary doesn't — keep them so the
  // pair stays informative when the primary is the one missing a stat.
  for (const c of compareStats) {
    if (seen.has(c.key)) continue;
    rows.push({
      key: c.key,
      label: c.label,
      leftValue: null,
      leftPercentile: null,
      rightValue: c.value,
      rightPercentile: c.percentile,
    });
  }
  return rows;
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

  // URL-backed compare entity. ?vs=<id> survives refresh and is shareable.
  // The local signal mirrors URL state so children can pass it to <CompareSearch>
  // as the controlled "selected" prop.
  const [searchParams, setSearchParams] = useSearchParams();
  const [compared, setComparedSig] = createSignal<AutocompleteEntity | null>(null);

  createEffect(() => {
    const raw = searchParams.vs;
    const vsId = typeof raw === "string" ? raw : null;
    if (!vsId) {
      if (compared() !== null) setComparedSig(null);
      return;
    }
    if (compared()?.id === vsId) return;
    entityDataStore.getEntities(sport)
      .then((list) => {
        const ent = list.find((e) => e.id === vsId && e.type === type) ?? null;
        setComparedSig(ent);
      })
      .catch(() => setComparedSig(null));
  });

  const setCompared = (entity: AutocompleteEntity | null) => {
    setComparedSig(entity);
    setSearchParams({ vs: entity?.id ?? null }, { replace: true });
  };

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

  const primaryPositionGroup = createMemo(() => resolvePositionGroup(primary(), sport));

  const primaryCohort = createMemo(() =>
    type === "player" ? pickCohortPosition(primary(), ctx.percentileScope()) : null,
  );
  const compareCohort = createMemo(() =>
    type === "player" ? pickCohortPosition(compare(), ctx.percentileScope()) : null,
  );

  const primarySlots = createMemo(() => {
    const d = primary();
    if (!d?.stats) return [];
    return showRate()
      ? categorizeRateForCharts(d.stats, primaryPercentiles(), sport)
      : categorizeForCharts(d.stats, primaryPercentiles(), sport, type, primaryPositionGroup());
  });

  const compareSlots = createMemo(() => {
    const d = compare();
    if (!d?.stats) return [];
    return showRate()
      ? categorizeRateForCharts(d.stats, comparePercentiles(), sport)
      : categorizeForCharts(d.stats, comparePercentiles(), sport, type, primaryPositionGroup());
  });

  const hasRateData = createMemo(() => {
    const d = primary();
    if (!d?.stats || type !== "player") return false;
    // NFL has no rate stats (only NBA/Football do), so this stays false
    // for NFL players regardless of position.
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

  const populatedSlots = createMemo(() =>
    slotData().filter((s) => s.chartStats.length >= 2),
  );

  // Backend stats payload doesn't always carry a `name` field. Fall back
  // to the bundled entity index (which CompareSearch already pulls from)
  // so the primary pill, legend, and aria-label all stay populated.
  const [primaryEntityName, setPrimaryEntityName] = createSignal("");
  createEffect(() => {
    entityDataStore.getEntities(sport)
      .then((list) => {
        const ent = list.find((e) => e.id === primaryId && e.type === type);
        if (ent?.name) setPrimaryEntityName(ent.name);
      })
      .catch(() => {});
  });
  const primaryName = createMemo(() => {
    const d = primary();
    const fromStats = d
      ? d.name || `${d.first_name || ""} ${d.last_name || ""}`.trim()
      : "";
    return fromStats || primaryEntityName();
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
                <Show when={primaryCohort()}>
                  <p class="compare-pill-cohort">Compared to {primaryCohort()}s</p>
                </Show>
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
              <Show when={hasCompare() && compareCohort()}>
                <p class="compare-pill-cohort">Compared to {compareCohort()}s</p>
              </Show>
            </div>
          </div>

          <Show when={hasCompare()}>
            <div class="butterfly-legend" aria-hidden="true">
              <span class="butterfly-legend-swatch butterfly-legend-swatch-primary" />
              <span class="butterfly-legend-label">{primaryName()}</span>
              <span class="butterfly-legend-sep">·</span>
              <span class="butterfly-legend-swatch butterfly-legend-swatch-secondary" />
              <span class="butterfly-legend-label">{compared()!.name}</span>
            </div>
          </Show>

          <For each={populatedSlots()}>
            {(slot) => {
              const primaryScore = () => overallScore(slot.chartStats);
              const compareScore = () => overallScore(slot.compareStats);
              const compareHasChart = () => slot.compareStats.length >= 2;
              return (
                <Shell as="article" aria-label={slot.category.label}>
                  <ShareTrigger
                    metadata={{
                      cardType: (hasCompare()
                        ? `compare:${slot.category.id}`
                        : `stats:${slot.category.id}`) as CardType,
                      entity: { sport, type, id: String(primaryId) },
                      entityName: primaryName(),
                      tab: "compare",
                      comparedEntity: compared()
                        ? { sport, type, id: String(compared()!.id) }
                        : undefined,
                    }}
                    ariaLabel={`Share this ${slot.category.label} comparison`}
                  />
                  <div class="stats-cell">
                    <p class="category-chart-label">{slot.category.label}</p>
                    <Show
                      when={hasCompare()}
                      fallback={
                        <>
                          <div class="stats-pizza-chart">
                            <PizzaChart stats={slot.chartStats} intenseHover options={CHART_OPTS} />
                          </div>
                          <p class="category-chart-label overall-score-line">
                            Overall score:{" "}
                            <span class="overall-score-value" style={{ color: tierColor(primaryScore()) }}>
                              {primaryScore()}
                            </span>
                          </p>
                        </>
                      }
                    >
                      <ButterflyChart
                        stats={buildButterflyStats(slot.chartStats, slot.compareStats)}
                        options={CHART_OPTS}
                      />
                      <div class="compare-score-row">
                        <p class="category-chart-label overall-score-line compare-score-primary">
                          Overall score:{" "}
                          <span class="overall-score-value" style={{ color: tierColor(primaryScore()) }}>
                            {primaryScore()}
                          </span>
                        </p>
                        <Show when={compareHasChart()}>
                          <p class="category-chart-label overall-score-line compare-score-secondary">
                            Overall score:{" "}
                            <span class="overall-score-value" style={{ color: tierColor(compareScore()) }}>
                              {compareScore()}
                            </span>
                          </p>
                        </Show>
                      </div>
                    </Show>
                  </div>
                </Shell>
              );
            }}
          </For>
        </Show>
      </Show>
    </section>
  );
}

export function CompareCardSkeleton() {
  // Round butterfly silhouettes with a faint vertical divider to evoke
  // the split — predictively sized to ~4 categories so cold-load CLS is small.
  return (
    <section class="compare-card" aria-label="Compare">
      <div class="card-loading">
        <Skeleton shape="line" width={320} height={40} />
      </div>
      <For each={[1, 2, 3, 4]}>
        {() => (
          <Shell as="article" aria-label="Compare slot">
            <div class="stats-cell">
              <Skeleton shape="line" width={80} height={12} />
              <div class="butterfly-skeleton">
                <Skeleton shape="circle" width={300} height={300} />
                <div class="butterfly-skeleton-divider" aria-hidden="true" />
              </div>
            </div>
          </Shell>
        )}
      </For>
    </section>
  );
}
