/**
 * CompositeCard — the rating engine's COMPOSITE datapoints as a pizza chart.
 *
 * Each composite datapoint (the `in_comp` rows of rating_breakdown) becomes a
 * wedge sized + colored by its 0-100 `pct` (store z, draw the percentile). The
 * headline "Composite NN" is the engine's rating_composite_rank, re-ranked by the
 * selected scope and re-rated by the selected per-X mode (rating_modes).
 *
 * NFL composites are facet-balanced (offense/defense/special) → one pizza per
 * facet; NBA/FOOTBALL + all teams are flat → a single pizza.
 *
 * Compare: when `ctx.vs` is set, the body switches to the <ButterflyChart> — one
 * mirror-halves wheel, the primary on the left semicircle and the vs entity on
 * the right, each datapoint a mirrored pair. Both entities get the SAME per-X
 * mode + scope (fetched via getSparkline, run through ratingForMode).
 *
 * Reads getSparkline → rating.rating_breakdown. Empty when the entity is unrated.
 */

import { For, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getSparkline, ratingForMode, fantasyForMode,
  type RatingDatapoint, type RatingView, type FantasyBlock,
} from "../../lib/data/sparkline.server";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import ButterflyChart, { type ButterflyStat } from "./ButterflyChart";
import { tierColor } from "../../lib/utils/tier-color";
import { nflSideOfBall } from "../../lib/utils/position-groups";
import { pillarLabel } from "../../lib/cards/card-meta";
import { getEntityMeta } from "./EntityMeta";
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

// Football GK-exclusive datapoints — hidden from outfielders' pizzas (no value
// there: NULL → z=0). A keeper keeps them (real values).
const GK_LABELS = new Set(["Shot-Stopping", "Penalty Saves", "Punching", "High Claims"]);

/** Pizza/butterfly membership: composite contributors (in_comp) + pure-display
 *  datapoints (!in_spec), pizza facets only, GK-only slices dropped for outfielders. */
const eligible = (d: RatingDatapoint): boolean =>
  (d.in_comp || !d.in_spec) && PIZZA_FACETS.includes(d.facet) && !(GK_LABELS.has(d.label) && d.value == null);

/** Raw volume — the underlying counting stat, shown under each wedge. */
const vol = (v: number | null): string => (v == null ? "—" : String(v));

/** Slice percentile honoring the active cohort scope: a player's per-datapoint
 *  position percentile (backend migration 043) when a scope is active, else the
 *  positionless `pct`. Mirrors how Per-X re-rates — the slices re-rank within the
 *  cohort. Falls back to `pct` for players with no scoped_pct (no cohort). */
const slicePct = (d: RatingDatapoint, scope: string): number =>
  scope !== "all" && d.scoped_pct?.[scope] != null ? d.scoped_pct[scope] : d.pct;

/** Datapoint → pizza wedge: scoped percentile drives the slice; raw VOLUME is the sub-label. */
function toStat(d: RatingDatapoint, scope: string): PizzaChartStat {
  return { key: d.label, label: d.label, value: vol(d.value), percentile: slicePct(d, scope), categoryId: d.facet };
}

/** Composite headline re-ranked within the selected cohort scope; "all" uses the
 *  positionless composite_rank. */
function scopedRank(v: RatingView | null, scope: string): number {
  if (v && scope !== "all" && v.scoped_ranks?.[scope] != null) return v.scoped_ranks[scope];
  return v?.composite_rank ?? 0;
}

/** Each facet pizza is its own card silhouette; the FIRST is the shareable
 *  `<Card>` (carries the ShareTrigger), the rest plain `<Shell>`. */
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

/** Single-entity composite — facets + pizzas + scoped headline. */
function CompositeView() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getSparkline(sport(), type(), id(), ctx.season()));

  const rating = () => data()?.rating ?? null;
  const view = () => {
    const r = rating();
    return r ? ratingForMode(r, ctx.rateMode()) : null;
  };

  const compositeLabel = () => pillarLabel("composite", type()) ?? "Composite";
  const facetLabel = (facet: string) =>
    facet === "all" ? compositeLabel() : FACET_LABEL[facet] ?? facet;

  const pizzaDatapoints = () => (view()?.breakdown ?? []).filter(eligible);

  const nflSide = () =>
    sport() === "nfl" && type() === "player" ? nflSideOfBall(rating()?.position) : null;

  const groups = () => {
    const byFacet = new Map<string, RatingDatapoint[]>();
    for (const d of pizzaDatapoints()) {
      const arr = byFacet.get(d.facet) ?? [];
      arr.push(d);
      byFacet.set(d.facet, arr);
    }
    const side = nflSide();
    return [...byFacet.entries()]
      .filter(([facet]) => !side || facet === side)
      .sort((a, b) => PIZZA_FACETS.indexOf(a[0]) - PIZZA_FACETS.indexOf(b[0]))
      .map(([facet, items]) => ({ facet, items }));
  };

  const chips = () =>
    (view()?.breakdown ?? []).filter((d) => !PIZZA_FACETS.includes(d.facet));

  const catPct = (facet: string): number | null =>
    rating()?.rating_categories?.[facet]?.pct ?? null;

  // Fantasy headline for the active rate mode (null when the entity/sport has none).
  const fantasyView = (): FantasyBlock | null => {
    const r = rating();
    return r ? fantasyForMode(r, ctx.rateMode()) : null;
  };

  // The foot-of-card headline. `value` is the displayed number (fantasy points in
  // Fantasy mode, the percentile in Regular); `pct` always drives the tier color.
  const scopedComposite = (): { value: string; pct: number; label: string } => {
    if (ctx.scoreModel() === "fantasy") {
      const f = fantasyView();
      const s = ctx.scope();
      const pct = s !== "all" && f?.scoped_ranks?.[s] != null ? f.scoped_ranks[s] : (f?.rank ?? 0);
      return { value: f?.points != null ? `${f.points.toFixed(1)} pts` : "—", pct, label: "Fantasy" };
    }
    const v = view();
    const s = ctx.scope();
    const pct = scopedRank(v, s);
    const label = s !== "all" && v?.scoped_ranks?.[s] != null
      ? `${compositeLabel()} · ${SCOPE_LABEL[s] ?? s}`
      : compositeLabel();
    return { value: pct.toFixed(1), pct, label };
  };

  /** The single rating shown at the foot of each facet card — one per card, always
   *  at the bottom (the OG share artifact crops the footer). Teams: the facet's own
   *  per-category sub-score, labeled by facet ("Offense · 80.0"). Players + flat
   *  single-pizza entities (no rating_categories): the scope-aware overall composite. */
  const cardScore = (facet: string): { value: string; pct: number; label: string } => {
    // Fantasy mode shows the entity-level fantasy headline on every card (not a
    // per-facet z-score); team category sub-scores apply to Regular only.
    if (ctx.scoreModel() === "fantasy") return scopedComposite();
    const cat = catPct(facet);
    return cat != null ? { value: cat.toFixed(1), pct: cat, label: facetLabel(facet) } : scopedComposite();
  };

  return (
    <Show when={rating()} fallback={<EmptyCard message="No rating yet." />}>
      {(_r) => (
        <Show when={groups().length > 0} fallback={<EmptyCard message="No rating yet." />}>
          <div class="composite-stack">
            <div class="composite-facets">
              <For each={groups()}>
                {(g, i) => (
                  <FacetFrame first={i() === 0} label={facetLabel(g.facet)}>
                    <div class="stats-cell">
                      <div class="stats-pizza-chart">
                        <PizzaChart stats={g.items.map((d) => toStat(d, ctx.scope()))} intenseHover options={CHART_OPTS} />
                      </div>
                      <p class="category-chart-label overall-score-line">
                        <span class="overall-score-content">
                          {cardScore(g.facet).label}:{" "}
                          <span style={{ color: tierColor(cardScore(g.facet).pct) }}>
                            {cardScore(g.facet).value}
                          </span>
                        </span>
                      </p>
                    </div>
                  </FacetFrame>
                )}
              </For>
            </div>
            <Show when={chips().length > 0}>
              <Shell as="article" aria-label="Team context">
                <div class="stats-cell">
                  <p class="category-chart-label">Discipline &amp; Squad</p>
                  <div style={{ display: "flex", "flex-wrap": "wrap", "justify-content": "center", gap: "0.75rem", "margin-top": "0.25rem" }}>
                    <For each={chips()}>
                      {(d) => (
                        <div style={{ display: "flex", "flex-direction": "column", "align-items": "center", "font-size": "0.72rem", "line-height": "1.25", color: tierColor(slicePct(d, ctx.scope())) }}>
                          <span>{d.label}</span>
                          <span style={{ opacity: "0.85" }}>{vol(d.value)} · {Math.round(slicePct(d, ctx.scope()))}</span>
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

/** Compare view — the butterfly. Primary on the left semicircle, the vs entity on
 *  the right; both run through the SAME per-X mode + scope. */
function CompareView() {
  const ctx = useProfile();
  const { sport, type } = ctx;
  const aData = createAsync(() => getSparkline(sport(), type(), ctx.id(), ctx.season()));
  const bData = createAsync(() => getSparkline(sport(), type(), ctx.vs()!, ctx.season()));
  const aMeta = createAsync(() => getEntityMeta(sport(), type(), ctx.id()));
  const bMeta = createAsync(() => getEntityMeta(sport(), type(), ctx.vs()!));

  const aView = () => { const r = aData()?.rating; return r ? ratingForMode(r, ctx.rateMode()) : null; };
  const bView = () => { const r = bData()?.rating; return r ? ratingForMode(r, ctx.rateMode()) : null; };

  // Merge both breakdowns by label → mirrored butterfly pairs (left = primary).
  const stats = (): ButterflyStat[] => {
    const a = (aView()?.breakdown ?? []).filter(eligible);
    const b = (bView()?.breakdown ?? []).filter(eligible);
    const aMap = new Map(a.map((d) => [d.label, d]));
    const bMap = new Map(b.map((d) => [d.label, d]));
    const labels = [...new Set([...a.map((d) => d.label), ...b.map((d) => d.label)])];
    const scope = ctx.scope();
    return labels.map((label) => {
      const da = aMap.get(label);
      const db = bMap.get(label);
      return {
        key: label, label,
        leftValue: da?.value ?? null, leftPercentile: da ? slicePct(da, scope) : null,
        rightValue: db?.value ?? null, rightPercentile: db ? slicePct(db, scope) : null,
      };
    });
  };

  return (
    <Show when={aView() && bView()} fallback={<EmptyCard message="No rating to compare." />}>
      <Card id="composite" as="article" aria-label="Compare">
        <div class="stats-cell">
          <div class="compare-headers">
            <div class="compare-header compare-header-left">
              <span class="compare-name">
                <span class="compare-key compare-key-primary" aria-hidden="true" />
                {aMeta()?.name ?? ""}
              </span>
              <span class="compare-score" style={{ color: tierColor(scopedRank(aView(), ctx.scope())) }}>
                {scopedRank(aView(), ctx.scope()).toFixed(1)}
              </span>
            </div>
            <span class="compare-vs">vs</span>
            <div class="compare-header compare-header-right">
              <span class="compare-name">
                {bMeta()?.name ?? ""}
                <span class="compare-key compare-key-secondary" aria-hidden="true" />
              </span>
              <span class="compare-score" style={{ color: tierColor(scopedRank(bView(), ctx.scope())) }}>
                {scopedRank(bView(), ctx.scope()).toFixed(1)}
              </span>
            </div>
          </div>
          <div class="stats-pizza-chart">
            <ButterflyChart stats={stats()} options={CHART_OPTS} />
          </div>
        </div>
      </Card>
    </Show>
  );
}

export default function CompositeCard() {
  const ctx = useProfile();
  return (
    <Show when={ctx.vs()} fallback={<CompositeView />}>
      <CompareView />
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
