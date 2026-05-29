/**
 * StatsCard — unified player/team stats tab, with built-in compare.
 *
 * One-chart-per-card layout (Phase D, refined 2026-05-20). Each of the
 * chart-slot categories (Attack / Possession / Defense / Discipline /
 * Setpiece) with >=2 valid percentiles renders as its OWN locked Shell.
 * Categories with no data are skipped — no empty cards, no half-filled
 * cards.
 *
 * Compare lives here too (folded in 2026-05-28 — Compare is no longer a
 * separate tab). The header carries a CompareSearch bar; pick a second
 * entity and every category swaps its single PizzaChart for a
 * ButterflyChart (primary sweeps the LEFT semicircle, the compared
 * entity the RIGHT). With no compare entity chosen the card reads as a
 * plain single-entity stats view.
 *
 * The compare entity is persisted in the URL as `?vs=<id>` (and the
 * secondary season as `?vsSeason=<N>`), so a comparison view is
 * shareable / survives refresh. The header — primary pill, paired
 * season selectors, and the compare search — sits OUTSIDE the
 * hasCharts() gate so the user can switch season or pick a compare
 * target even on a season with no stats (never trapped on an empty
 * season). Only the rate/scope toolbar, legend, and charts are gated.
 *
 * Per-entity cohort disclaimer ("Compared to {position}s") sits under
 * each pill — two players may be benched against different cohorts on
 * the backend, so this surfaces it explicitly.
 */

import { createSignal, createMemo, createEffect, Show, For } from "solid-js";
import { createAsync, useSearchParams } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStats } from "../../lib/data/stats.server";
import {
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  getBaseLabel,
  pickPercentiles,
  pickCohortPosition,
  hasScopedPercentiles,
  resolvePositionGroup,
  getStatLabel,
  type Category,
} from "../../lib/utils/stats-categorizer";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import ButterflyChart, { type ButterflyStat } from "./ButterflyChart";
import CompareSearch from "./CompareSearch";
import NavStrip from "./NavStrip";
import ScopeStrip from "./ScopeStrip";
import SeasonSelect from "./SeasonSelect";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import EmptyCard from "./EmptyCard";
import type { AutocompleteEntity } from "../../lib/types";
import { tierColor } from "../../lib/utils/tier-color";
import "./StatsCard.css";

/* Chart sized to fit comfortably inside the portrait Shell's content
 * area (480 - 48 padding = 432 wide). viewBox is padded past the
 * label-extent radius so even the widest stat labels stay inside the
 * SVG box and the chart reads as horizontally centered. */
const CHART_OPTS = { width: 400, height: 360, outerRadius: 130, labelOffset: 22 };

/* Average percentile across a category's stats, rounded — the
 * "Overall rating: NN" readout. Applied per-entity in the butterfly
 * compare so each side gets its own colored score. */
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

export default function StatsCard() {
  const ctx = useProfile();
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const type = ctx.type;
  const primaryId = ctx.id;

  const primary = createAsync(() => getStats(sport, type, primaryId, ctx.season()));

  const availableSeasons = createMemo<readonly number[]>(
    () => primary()?.meta?.available_seasons ?? [],
  );
  const resolvedSeason = createMemo<number | null>(
    () => ctx.season() ?? primary()?.meta?.season ?? null,
  );

  /* Default season picked for the comparison entity when the user
   * hasn't explicitly chosen one via the secondary dropdown. For
   * self-compare (same id on both sides), prefer the next-older entry
   * in the primary's available_seasons so the chart isn't a self-
   * mirror; oldest-pick falls back to nearest other season. For
   * cross-entity, follow the primary's season — backend falls back to
   * the secondary's newest if it doesn't exist in scope (per
   * ENDPOINTS.md cross-entity navigation contract). */
  const compareDefaultSeason = (other: AutocompleteEntity): number | null => {
    if (other.id !== primaryId) return ctx.season();
    const list = availableSeasons();
    if (list.length === 0) return null;
    const current = resolvedSeason() ?? list[0];
    const idx = list.indexOf(current);
    if (idx >= 0 && idx + 1 < list.length) return list[idx + 1];
    return list.find((s) => s !== current) ?? null;
  };

  // URL-backed compare entity + secondary season. `?vs=<id>` survives
  // refresh and is shareable; `?vsSeason=<N>` does the same for the
  // secondary dropdown so a "Cowboys 2025 vs Cowboys 2022" link
  // deep-links cleanly.
  const [searchParams, setSearchParams] = useSearchParams();
  const [compared, setComparedSig] = createSignal<AutocompleteEntity | null>(null);

  const parsedVsSeason = () => {
    const raw = searchParams.vsSeason;
    if (typeof raw !== "string" || !raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const [compareSeasonExplicit, setCompareSeasonExplicitSig] =
    createSignal<number | null>(parsedVsSeason());

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
    // New compare target → drop the explicit season override so the
    // smart default (self-compare prior year / cross-entity matched
    // year) picks the right slot again.
    setCompareSeasonExplicitSig(null);
    setSearchParams({ vs: entity?.id ?? null, vsSeason: null }, { replace: true });
  };

  const setCompareSeasonExplicit = (next: number | null) => {
    setCompareSeasonExplicitSig(next);
    setSearchParams({ vsSeason: next == null ? null : String(next) }, { replace: true });
  };

  const compareSeasonResolved = createMemo<number | null>(() => {
    const explicit = compareSeasonExplicit();
    if (explicit != null) return explicit;
    const other = compared();
    return other ? compareDefaultSeason(other) : null;
  });

  const compare = createAsync(() => {
    const c = compared();
    return c ? getStats(sport, type, c.id, compareSeasonResolved()) : Promise.resolve(null);
  });

  const compareAvailableSeasons = createMemo<readonly number[]>(
    () => compare()?.meta?.available_seasons ?? [],
  );

  const [showRate, setShowRate] = createSignal(false);
  const rateLabel = createMemo(() => (type === "player" ? getRateLabel(sport) : null));
  const baseLabel = createMemo(() => getBaseLabel(sport));

  const primaryPercentiles = createMemo(() => pickPercentiles(primary(), ctx.percentileScope()));
  const comparePercentiles = createMemo(() => pickPercentiles(compare(), ctx.percentileScope()));

  const scopeAvailable = createMemo(() => hasScopedPercentiles(primary()));
  const scopeName = createMemo(
    () => primary()?.scoped_percentile_metadata?.scope_name ?? "",
  );

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
      ? categorizeRateForCharts(d.stats, primaryPercentiles(), sport, type, primaryPositionGroup())
      : categorizeForCharts(d.stats, primaryPercentiles(), sport, type, primaryPositionGroup());
  });

  // The compare entity is categorized against the PRIMARY's position
  // group so both sides share one stat universe (e.g. a WR vs CB compare
  // shows the same receiving rings — the CB's just read mostly empty).
  const compareSlots = createMemo(() => {
    const d = compare();
    if (!d?.stats) return [];
    return showRate()
      ? categorizeRateForCharts(d.stats, comparePercentiles(), sport, type, primaryPositionGroup())
      : categorizeForCharts(d.stats, comparePercentiles(), sport, type, primaryPositionGroup());
  });

  const hasRateData = createMemo(() => {
    const d = primary();
    if (!d?.stats || type !== "player") return false;
    return categorizeRateForCharts(d.stats, primaryPercentiles(), sport, type, primaryPositionGroup())
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
  const showToolbar = createMemo(
    () =>
      (type === "player" && hasRateData() && !!rateLabel()) ||
      (scopeAvailable() && !!scopeName()),
  );

  return (
    <section class="stats-card" aria-label="Stats">
      <Show when={primary()} fallback={<div class="stats-error"><p>Unable to load statistics</p></div>}>
        {/* Header — primary pill | paired season selectors | compare
            search. OUTSIDE the hasCharts() gate so season switching and
            picking a compare target stay reachable on an empty season. */}
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
          <div class="compare-header-slot compare-header-season">
            <Show when={availableSeasons().length > 1 || (hasCompare() && compareAvailableSeasons().length > 1)}>
              <div class="compare-season-pair">
                <Show
                  when={availableSeasons().length > 1}
                  fallback={<span class="compare-season-placeholder" aria-hidden="true" />}
                >
                  <SeasonSelect
                    seasons={availableSeasons()}
                    value={resolvedSeason()}
                    onChange={(s) => ctx.setSeason(s)}
                    ariaLabel="Primary season"
                  />
                </Show>
                <Show when={hasCompare()}>
                  <span class="compare-season-sep" aria-hidden="true" />
                  <Show
                    when={compareAvailableSeasons().length > 1}
                    fallback={<span class="compare-season-placeholder" aria-hidden="true" />}
                  >
                    <SeasonSelect
                      seasons={compareAvailableSeasons()}
                      value={compareSeasonResolved()}
                      onChange={(s) => setCompareSeasonExplicit(s)}
                      ariaLabel="Comparison season"
                    />
                  </Show>
                </Show>
              </div>
            </Show>
          </div>
          <div class="compare-header-slot compare-header-secondary">
            <CompareSearch
              sport={sport}
              entityType={type}
              selected={compared()}
              onSelect={setCompared}
            />
            <Show when={hasCompare() && compareCohort()}>
              <p class="compare-pill-cohort">Compared to {compareCohort()}s</p>
            </Show>
          </div>
        </div>

        <Show
          when={hasCharts()}
          fallback={<EmptyCard note="(no stats for this season)" />}
        >
          {/* Rate + scope strip — only meaningful when charts are present. */}
          <Show when={showToolbar()}>
            <div class="stats-toolbar" role="toolbar" aria-label="Stats controls">
              <Show when={type === "player" && hasRateData() && rateLabel()}>
                <NavStrip
                  inline
                  ariaLabel="Rate"
                  active={showRate() ? "rate" : "per-game"}
                  onSelect={(id) => setShowRate(id === "rate")}
                  items={[
                    { id: "per-game", label: baseLabel() },
                    { id: "rate", label: rateLabel() ?? "" },
                  ]}
                />
              </Show>
              <ScopeStrip data={primary()} />
            </div>
          </Show>

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
                            <span class="overall-score-content">
                              Overall rating:{" "}
                              <span style={{ color: tierColor(primaryScore()) }}>
                                {primaryScore()}
                              </span>
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
                          <span class="overall-score-content">
                            Overall rating:{" "}
                            <span style={{ color: tierColor(primaryScore()) }}>
                              {primaryScore()}
                            </span>
                          </span>
                        </p>
                        <Show when={compareHasChart()}>
                          <p class="category-chart-label overall-score-line compare-score-secondary">
                            <span class="overall-score-content">
                              Overall rating:{" "}
                              <span style={{ color: tierColor(compareScore()) }}>
                                {compareScore()}
                              </span>
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

export function StatsCardSkeleton() {
  // Matches the resolved layout: a header line (name + compare search)
  // over a stack of ~4 chart Shells. Predictively sized so cold-load
  // CLS stays small.
  return (
    <section class="stats-card" aria-label="Stats">
      <div class="compare-header" aria-hidden="true">
        <div class="compare-header-slot compare-header-primary">
          <Skeleton shape="line" width={120} height={20} />
        </div>
        <div class="compare-header-slot compare-header-season">
          <Skeleton shape="line" width={60} height={20} />
        </div>
        <div class="compare-header-slot compare-header-secondary">
          <Skeleton shape="line" width={180} height={28} />
        </div>
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
