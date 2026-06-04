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

import { For, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStarline, type RatingDatapoint } from "../../lib/data/starline.server";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import { tierColor } from "../../lib/utils/tier-color";
import { pillarLabel } from "../../lib/cards/card-meta";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./StatsCard.css";

const CHART_OPTS = { width: 400, height: 360, outerRadius: 130, labelOffset: 22 };
const PIZZA_FACETS = ["offense", "defense", "special", "all"];
const FACET_LABEL: Record<string, string> = {
  offense: "Offense",
  defense: "Defense",
  special: "Special Teams",
  all: "Composite",
  discipline: "Discipline",
  squad: "Squad",
};

const SCOPE_LABEL: Record<string, string> = {
  position: "Position", conference: "Conference", division: "Division", league: "League",
};

// Football GK-exclusive datapoints — hidden from outfielders' pizzas (they have no
// value there: NULL → z=0). A keeper keeps them (real values).
const GK_LABELS = new Set(["Shot-Stopping", "Penalty Saves", "Punching", "High Claims"]);

/** Raw volume — the underlying counting stat, shown under each wedge. */
const vol = (v: number | null): string => (v == null ? "—" : String(v));

/** Datapoint → pizza wedge: percentile drives the slice; raw VOLUME is the sub-label. */
function toStat(d: RatingDatapoint): PizzaChartStat {
  return { key: d.label, label: d.label, value: vol(d.value), percentile: d.pct, categoryId: d.facet };
}

/** Each facet pizza is its own card silhouette; the FIRST one is the shareable
 *  `<Card>` (carries the single ShareTrigger), the rest are plain `<Shell>`. */
function FacetFrame(props: { first: boolean; label: string; children: JSX.Element }) {
  return (
    <Show
      when={props.first}
      fallback={<Shell as="article" aria-label={props.label}>{props.children}</Shell>}
    >
      <Card id="composite" as="article" aria-label={props.label}>{props.children}</Card>
    </Show>
  );
}

export default function CompositeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getStarline(sport(), type(), id(), ctx.season()));

  const rating = () => data()?.rating ?? null;

  // Client-facing composite label: "General" (player) / "Rating" (team). Reactive
  // so it updates if the entity type changes (player↔team) in place.
  const compositeLabel = () => pillarLabel("composite", type()) ?? "Composite";
  const facetLabel = (facet: string) =>
    facet === "all" ? compositeLabel() : FACET_LABEL[facet] ?? facet;

  // Pizza datapoints = composite contributors (in_comp) PLUS pure display
  // datapoints (in_comp=false & in_spec=false: oreb/dreb split, opp FG%, etc.).
  // Specialist-only terms (in_spec, not in_comp — e.g. NBA Foul Drawing) stay OUT;
  // they live on the Specialist card.
  const pizzaDatapoints = () =>
    (rating()?.rating_breakdown ?? []).filter(
      (d) =>
        (d.in_comp || !d.in_spec) &&
        // Drop GK-exclusive slices for non-keepers (no data → NULL value).
        !(GK_LABELS.has(d.label) && d.value == null),
    );

  // Pizza facets (offense/defense/special/all) → one ring each.
  const groups = () => {
    const byFacet = new Map<string, RatingDatapoint[]>();
    for (const d of pizzaDatapoints()) {
      if (!PIZZA_FACETS.includes(d.facet)) continue;
      const arr = byFacet.get(d.facet) ?? [];
      arr.push(d);
      byFacet.set(d.facet, arr);
    }
    return [...byFacet.entries()]
      .sort((a, b) => PIZZA_FACETS.indexOf(a[0]) - PIZZA_FACETS.indexOf(b[0]))
      .map(([facet, items]) => ({ facet, items }));
  };

  // Non-pizza facets (discipline / squad) → chips, whether rated (NFL penalty
  // yards) or display-only (football cards/injuries).
  const chips = () =>
    (rating()?.rating_breakdown ?? []).filter((d) => !PIZZA_FACETS.includes(d.facet));

  // Per-category percentile (teams: rating_categories[facet].pct); null for players.
  const catPct = (facet: string): number | null =>
    rating()?.rating_categories?.[facet]?.pct ?? null;

  // Composite headline re-ranks within the selected cohort scope (rating_scoped_ranks);
  // "all" uses the positionless rating_composite_rank.
  const scopedComposite = (): { pct: number; label: string } => {
    const r = rating();
    const s = ctx.scope();
    if (r && s !== "all" && r.rating_scoped_ranks?.[s] != null) {
      return { pct: r.rating_scoped_ranks[s], label: `${compositeLabel()} · ${SCOPE_LABEL[s] ?? s}` };
    }
    return { pct: r?.rating_composite_rank ?? 0, label: compositeLabel() };
  };

  return (
    <Show when={rating()} fallback={<EmptyCard message="No rating yet." />}>
      {(r) => (
        <Show when={groups().length > 0} fallback={<EmptyCard message="No rating yet." />}>
          <div class="composite-stack">
          <div class="composite-facets">
          <For each={groups()}>
            {(g, i) => (
              <FacetFrame first={i() === 0} label={facetLabel(g.facet)}>
                <div class="stats-cell">
                  <p class="category-chart-label">
                    {facetLabel(g.facet)}
                    <Show when={catPct(g.facet) != null}>
                      {" · "}
                      <span style={{ color: tierColor(catPct(g.facet)!) }}>
                        {catPct(g.facet)!.toFixed(1)}
                      </span>
                    </Show>
                  </p>
                  <div class="stats-pizza-chart">
                    <PizzaChart stats={g.items.map(toStat)} intenseHover options={CHART_OPTS} />
                  </div>
                  <Show when={i() === 0}>
                    <p class="category-chart-label overall-score-line">
                      <span class="overall-score-content">
                        {scopedComposite().label}:{" "}
                        <span style={{ color: tierColor(scopedComposite().pct) }}>
                          {scopedComposite().pct.toFixed(1)}
                        </span>
                      </span>
                    </p>
                  </Show>
                </div>
              </FacetFrame>
            )}
          </For>
          </div>
          <Show when={chips().length > 0}>
            <Shell as="article" aria-label="Team context">
              <div class="stats-cell">
                <p class="category-chart-label">Discipline &amp; Squad</p>
                <div
                  style={{
                    display: "flex",
                    "flex-wrap": "wrap",
                    "justify-content": "center",
                    gap: "0.75rem",
                    "margin-top": "0.25rem",
                  }}
                >
                  <For each={chips()}>
                    {(d) => (
                      <div
                        style={{
                          display: "flex",
                          "flex-direction": "column",
                          "align-items": "center",
                          "font-size": "0.72rem",
                          "line-height": "1.25",
                          color: tierColor(d.pct),
                        }}
                      >
                        <span>{d.label}</span>
                        <span style={{ opacity: "0.85" }}>
                          {vol(d.value)} · {Math.round(d.pct)}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Shell>
          </Show>
          </div>
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
