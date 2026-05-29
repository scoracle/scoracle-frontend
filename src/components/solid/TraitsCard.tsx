/**
 * TraitsCard — Strengths & weaknesses display (Solid.js)
 *
 * Reads stats via the same `getStats` query as StatsCard.
 * `query()` dedupes the call by [sport, type, id] — by the time the
 * user clicks Traits, the data is already in the cache. SWR-style live
 * updates fall out for free: when StatsCard triggers a background
 * revalidation, this memo re-derives without any subscription wiring.
 *
 * Uniform tab shape: data + render. Loading skeleton is `TraitsCardSkeleton`,
 * wired via TabDef.fallback in StatsCard.
 */

import { createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStats } from "../../lib/data/stats.server";
import {
  categorizeStats,
  pickPercentiles,
  pickCohortPosition,
  hasScopedPercentiles,
  resolvePositionGroup,
  type Category,
} from "../../lib/utils/stats-categorizer";
import type { EntityType } from "../../lib/types";

/**
 * Stat keys that aren't meaningful as a *team* strength or weakness.
 * A high games/matches-played count just means the season is further
 * along — it doesn't say anything about whether the team is good or
 * bad. Stays a trait for players (the greatest ability is availability).
 */
const TEAM_TRAIT_BLOCKLIST = new Set(["games_played", "matches_played"]);
import Shell from "./Shell";
import ScopeStrip from "./ScopeStrip";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./StatsCard.css";
import "./TraitsCard.css";

interface TraitItem {
  key: string;
  label: string;
  value: number | string | null;
  percentile: number;
  indicator: string;
  count: number;
  type: "strength" | "weakness";
}

function getIndicator(percentile: number): { symbol: string; count: number; type: "strength" | "weakness" } | null {
  if (percentile >= 90) return { symbol: "+", count: 4, type: "strength" };
  if (percentile >= 80) return { symbol: "+", count: 3, type: "strength" };
  if (percentile >= 70) return { symbol: "+", count: 2, type: "strength" };
  if (percentile <= 10) return { symbol: "-", count: 4, type: "weakness" };
  if (percentile <= 20) return { symbol: "-", count: 3, type: "weakness" };
  if (percentile <= 30) return { symbol: "-", count: 2, type: "weakness" };
  return null;
}

function extractTraits(
  categories: Category[],
  type: EntityType,
): { strengths: TraitItem[]; weaknesses: TraitItem[] } {
  const strengths: TraitItem[] = [];
  const weaknesses: TraitItem[] = [];

  for (const cat of categories) {
    for (const stat of cat.stats) {
      if (stat.percentile === undefined || stat.percentile === null) continue;
      if (type === "team" && TEAM_TRAIT_BLOCKLIST.has(stat.key)) continue;
      const ind = getIndicator(stat.percentile);
      if (!ind) continue;

      const item: TraitItem = {
        key: stat.key,
        label: stat.label,
        value: stat.value,
        percentile: stat.percentile,
        indicator: ind.symbol,
        count: ind.count,
        type: ind.type,
      };

      if (ind.type === "strength") strengths.push(item);
      else weaknesses.push(item);
    }
  }

  strengths.sort((a, b) => b.percentile - a.percentile);
  weaknesses.sort((a, b) => a.percentile - b.percentile);
  return { strengths, weaknesses };
}

function formatValue(value: number | string | null): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    if (value > 0 && value < 1) return (value * 100).toFixed(1) + "%";
    if (!Number.isInteger(value)) return value.toFixed(1);
  }
  return String(value);
}

function TraitList(props: { items: TraitItem[]; emptyMsg: string }) {
  return (
    <div class="sw-list">
      <Show when={props.items.length > 0} fallback={<p class="sw-none">{props.emptyMsg}</p>}>
        <For each={props.items}>
          {(item) => (
            <div class="sw-item">
              <div class="sw-item-info">
                <span class="sw-item-label">{item.label}</span>
                <span class="sw-item-value">{formatValue(item.value)}</span>
              </div>
              <div class={`sw-item-indicator ${item.type}`}>
                {item.indicator.repeat(item.count)}
                <span class="sw-item-percentile">{Math.round(item.percentile)}%</span>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}

export default function TraitsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const stats = createAsync(() => getStats(sport, type, id, ctx.season()));

  const scopeAvailable = createMemo(() => hasScopedPercentiles(stats()));
  const scopeName = createMemo(
    () => stats()?.scoped_percentile_metadata?.scope_name ?? "",
  );
  const cohortPosition = createMemo(() =>
    type === "player" ? pickCohortPosition(stats(), ctx.percentileScope()) : null,
  );

  const traits = createMemo(() => {
    const s = stats();
    if (!s?.stats) return null;
    const categories = categorizeStats(
      s.stats,
      pickPercentiles(s, ctx.percentileScope()),
      sport,
      type,
      resolvePositionGroup(s, sport),
    );
    if (categories.length === 0) return null;
    return extractTraits(categories, type);
  });

  return (
    <section class="traits-card" aria-label="Traits">
      <Show when={scopeAvailable() && scopeName()}>
        <div class="stats-toolbar" role="toolbar" aria-label="Trait scope">
          <ScopeStrip data={stats()} />
        </div>
      </Show>
      <Shell as="article" class="traits-card-shell sw-body" aria-label="Traits">
        <Show when={cohortPosition()}>
          <p class="traits-card-cohort">Compared to {cohortPosition()}s</p>
        </Show>
        <Show when={traits()} fallback={<div class="card-empty">No notable traits</div>}>
          {(result) => (
            <div class="sw-content">
              <div class="sw-section">
                <div class="section-header">
                  <span class="section-icon strength-icon">+</span>
                  <h4 class="section-title">Strengths</h4>
                </div>
                <TraitList items={result().strengths} emptyMsg="No notable strengths" />
              </div>
              <div class="sw-section">
                <div class="section-header">
                  <span class="section-icon weakness-icon">-</span>
                  <h4 class="section-title">Weaknesses</h4>
                </div>
                <TraitList items={result().weaknesses} emptyMsg="No notable weaknesses" />
              </div>
            </div>
          )}
        </Show>
      </Shell>
    </section>
  );
}

export function TraitsCardSkeleton() {
  // Skeleton sized to typical resolved Traits — two sections (strengths +
  // weaknesses) of ~5 items each at ~56 px = ~680 px total counting
  // headers. Predictive sizing keeps first-activation CLS small without
  // a fixed page-level reservation.
  return (
    <Shell as="article" class="traits-card-shell sw-loading" aria-label="Traits">
      <div class="sw-skeleton-section">
        <Skeleton shape="line" width={100} height={16} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
      </div>
      <div class="sw-skeleton-section">
        <Skeleton shape="line" width={100} height={16} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
        <Skeleton shape="block" height={56} />
      </div>
    </Shell>
  );
}
