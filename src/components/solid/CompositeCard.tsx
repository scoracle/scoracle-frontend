/**
 * CompositeCard — the rating engine's COMPOSITE datapoints as a pizza chart.
 *
 * Replaces the old stat-category pizza (Stats tab). Each composite datapoint
 * (the `in_comp` rows of rating_breakdown) becomes a wedge sized + colored by
 * its 0-100 `pct` (the core principle: store z, draw the percentile). The signed
 * raw z rides along as the wedge sub-label (the transparent "what your composite
 * is built from"). The headline "Composite NN" is the engine's
 * rating_composite_rank.
 *
 * NFL composites are facet-balanced (offense/defense/special), so NFL players
 * get one pizza per facet (mirrors StatsCard's multi-slot layout); NBA/FOOTBALL
 * + all teams are flat → a single pizza.
 *
 * Reads getStarline → rating.rating_breakdown. Empty when the entity is unrated.
 * Plumbing baseline — compare mode (butterfly) is a deferred follow-on.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStarline, type RatingDatapoint } from "../../lib/data/starline.server";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import { tierColor } from "../../lib/utils/tier-color";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./StatsCard.css";

const CHART_OPTS = { width: 400, height: 360, outerRadius: 130, labelOffset: 22 };
const FACET_ORDER = ["offense", "defense", "special", "all"];
const FACET_LABEL: Record<string, string> = {
  offense: "Offense",
  defense: "Defense",
  special: "Special Teams",
  all: "Composite",
};

const fz = (z: number): string => `${z >= 0 ? "+" : ""}${z.toFixed(1)}`;

/** Datapoint → pizza wedge: percentile drives the slice; signed z is fine-print. */
function toStat(d: RatingDatapoint): PizzaChartStat {
  return { key: d.label, label: d.label, value: fz(d.z), percentile: d.pct, categoryId: d.facet };
}

export default function CompositeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getStarline(sport, type, id, ctx.season()));

  const rating = () => data()?.rating ?? null;

  // Composite datapoints grouped by facet (NFL → offense/defense/special; every
  // other sport collapses to a single "all" group).
  const groups = () => {
    const comp = (rating()?.rating_breakdown ?? []).filter((d) => d.in_comp);
    const byFacet = new Map<string, RatingDatapoint[]>();
    for (const d of comp) {
      const arr = byFacet.get(d.facet) ?? [];
      arr.push(d);
      byFacet.set(d.facet, arr);
    }
    return [...byFacet.entries()]
      .sort((a, b) => FACET_ORDER.indexOf(a[0]) - FACET_ORDER.indexOf(b[0]))
      .map(([facet, items]) => ({ facet, items }));
  };

  return (
    <Show when={rating()} fallback={<EmptyCard message="No rating yet." />}>
      {(r) => (
        <Show when={groups().length > 0} fallback={<EmptyCard message="No rating yet." />}>
          <For each={groups()}>
            {(g, i) => (
              <Shell as="article" aria-label={FACET_LABEL[g.facet] ?? g.facet}>
                <div class="stats-cell">
                  <p class="category-chart-label">{FACET_LABEL[g.facet] ?? g.facet}</p>
                  <div class="stats-pizza-chart">
                    <PizzaChart stats={g.items.map(toStat)} intenseHover options={CHART_OPTS} />
                  </div>
                  <Show when={i() === 0}>
                    <p class="category-chart-label overall-score-line">
                      <span class="overall-score-content">
                        Composite:{" "}
                        <span style={{ color: tierColor(r().rating_composite_rank) }}>
                          {r().rating_composite_rank.toFixed(1)}
                        </span>
                      </span>
                    </p>
                  </Show>
                </div>
              </Shell>
            )}
          </For>
        </Show>
      )}
    </Show>
  );
}

export function CompositeCardSkeleton() {
  return (
    <Shell as="article" aria-label="Composite">
      <div class="stats-cell">
        <Skeleton shape="line" width={120} height={12} />
        <Skeleton shape="line" width={320} height={320} />
        <Skeleton shape="line" width={140} height={14} />
      </div>
    </Shell>
  );
}
