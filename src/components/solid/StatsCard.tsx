/**
 * StatsCard — the rating engine's COMPOSITE datapoints as a pizza chart.
 *
 * Each composite datapoint (the `in_comp` rows of rating_breakdown) becomes a
 * wedge sized + colored by its 0-100 `pct` (store z, draw the percentile). The
 * headline "Composite NN" is the engine's rating_composite_rank, re-ranked by the
 * selected scope and re-rated by the selected per-X mode (rating_modes).
 *
 * The rating IS z-scores, so the DEFAULT card renders the z-score breakdown
 * (rating_breakdown): NBA + Football players get one flat pizza; teams get
 * offense + defense pizzas; NFL players stay facet-balanced (offense/defense/
 * special, side-of-ball filtered). The lone outlier is NFL OFFENSIVE PLAYERS —
 * their counting-stat (fantasy) template is the default stats card (QB attempts/
 * yards/TDs etc.). The Fantasy model swaps any fantasy-supported entity to its
 * counting-stat template + fantasy headline. The team facet-card footer shows
 * the facet label only (the numeric sub-score was dropped 2026-06-10 — cardScore).
 *
 * Compare: when `ctx.vs` is set, the body switches to the <ButterflyChart> — one
 * mirror-halves wheel, the primary on the left semicircle and the vs entity on
 * the right, each datapoint a mirrored pair. Both entities get the SAME per-X
 * mode + scope (fetched via getStats, run through ratingForMode).
 *
 * Reads getStats → rating.rating_breakdown. Empty when the entity is unrated.
 */

import { For, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getStats, ratingForMode, fantasyForMode, templateForMode,
  type RatingDatapoint, type RatingView, type FantasyBlock, type TemplateStat,
} from "../../lib/data/stats.server";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import ButterflyChart, { type ButterflyStat } from "./ButterflyChart";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
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
  // Football template facets (backend migration 055)
  attacking: "Attacking",
  passing: "Passing",
  defending: "Defending",
  "shot-stopping": "Shot-Stopping",
  fantasy: "Fantasy",
};

const SCOPE_LABEL: Record<string, string> = {
  position: "Position", conference: "Conference", division: "Division", league: "League",
};

/** Pizza/butterfly membership: the z-score (composite) datapoints only — the
 *  metrics that actually compose the rating. Display-only datapoints (in_comp =
 *  FALSE — e.g. football Clearances / Blocks / Penalties Won) are excluded: the
 *  card shows what's rated, nothing decorative (honesty over volume). Pizza facets
 *  only. (The football goalkeeper special-case that used to live here is now data —
 *  position-gated datapoints in rating_datapoints; a keeper's breakdown carries only
 *  keeping metrics, an outfielder's only outfield metrics.) */
const eligible = (d: RatingDatapoint): boolean =>
  d.in_comp && PIZZA_FACETS.includes(d.facet);

/** Raw volume — the underlying counting stat, shown under each wedge. */
const vol = (v: number | null): string => (v == null ? "—" : String(v));

/** Slice percentile honoring the active cohort scope (backend migrations 043 + 058):
 *  the per-wedge percentile re-ranked within the selected cohort. Reads
 *  `scoped_pct[scope]` for ANY scope (incl. 'all' where a positionless cohort is
 *  stored), falling back to the baseline `pct` when the wedge lacks that cohort.
 *  Uniform across the z-pizza (base pct = positionless) and the counting-stat
 *  template (base pct = within-position; 'all' carried in scoped_pct). */
const scopePct = (
  s: { pct: number; scoped_pct?: Record<string, number> | null },
  scope: string,
): number => s.scoped_pct?.[scope] ?? s.pct;

/** Datapoint → pizza wedge: scoped percentile drives the slice; raw VOLUME is the sub-label. */
function toStat(d: RatingDatapoint, scope: string): PizzaChartStat {
  return { key: d.label, label: d.label, value: vol(d.value), percentile: scopePct(d, scope), categoryId: d.facet };
}

/** Composite magnitude SCORE re-scoped within the selected cohort; "all" uses the
 *  positionless composite_score. (Mirrors the per-wedge scope re-rank, but on the
 *  0-100 score scale — the displayed Rating headline.) */
function scopedScore(v: RatingView | null, scope: string): number {
  if (v && scope !== "all" && v.scoped_scores?.[scope] != null) return v.scoped_scores[scope];
  return v?.composite_score ?? 0;
}

/** Composite percentile RANK re-scoped within the selected cohort; "all" uses the
 *  positionless composite_rank. The percentile parallel to scopedScore — teams
 *  surface this (magnitude is players-only). */
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
      <Card id="stats" as="article" aria-label={props.label}>{props.children}</Card>
    </Show>
  );
}

/** Single-entity composite — facets + pizzas + scoped headline. */
function CompositeView() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getStats(sport(), type(), id(), ctx.season()));

  const rating = () => data()?.rating ?? null;
  const view = () => {
    const r = rating();
    return r ? ratingForMode(r, ctx.rateMode()) : null;
  };

  const compositeLabel = () => pillarLabel("stats", type()) ?? "Stats";
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

  // The template pizza source for the active rate mode. The rating IS z-scores, so the
  // DEFAULT card now renders the z-score breakdown for NBA / Football / all teams (one
  // pizza for players, offense+defense for teams) — surfacing today's updated rating
  // datapoints. NFL OFFENSIVE PLAYERS are the only outlier: their counting-stat
  // (fantasy) template is the default. Fantasy model still swaps any fantasy-supported
  // entity to its counting-stat template + fantasy headline. Null → z-pizza below.
  const template = () => {
    const r = rating();
    if (!r) return null;
    const t = templateForMode(r, ctx.rateMode());
    if (!t || t.length === 0) return null;
    if (ctx.scoreModel() === "fantasy") return t;
    // `t` is non-null only where a template exists; for NFL that's offensive
    // positions only, so this targets NFL offensive players exactly.
    return sport() === "nfl" && type() === "player" ? t : null;
  };
  const toTemplateStat = (t: TemplateStat, scope: string): PizzaChartStat => ({
    key: t.key, label: t.label, value: vol(t.value), percentile: scopePct(t, scope), categoryId: t.facet ?? "all",
  });
  // The pizzas to render: template wedges grouped by facet (football — one pizza per
  // facet, curation order; unfaceted NFL/NBA fantasy templates collapse into the single
  // "Fantasy" pizza), else the facet-grouped z-score pizzas. Template wedges re-rank
  // within the active cohort scope (backend migration 058) — same as the z-pizza.
  const pizzaGroups = (): { facet: string; label: string; stats: PizzaChartStat[] }[] => {
    const tmpl = template();
    if (tmpl && tmpl.length > 0) {
      const byFacet = new Map<string, TemplateStat[]>();
      for (const t of tmpl) {
        const f = t.facet ?? "fantasy";
        const arr = byFacet.get(f) ?? [];
        arr.push(t);
        byFacet.set(f, arr);
      }
      return [...byFacet.entries()].map(([facet, items]) => ({
        facet,
        label: facetLabel(facet),
        stats: items.map((t) => toTemplateStat(t, ctx.scope())),
      }));
    }
    return groups().map((g) => ({
      facet: g.facet,
      label: facetLabel(g.facet),
      stats: g.items.map((d) => toStat(d, ctx.scope())),
    }));
  };

  // Fantasy headline for the active rate mode (null when the entity/sport has none).
  const fantasyView = (): FantasyBlock | null => {
    const r = rating();
    return r ? fantasyForMode(r, ctx.rateMode()) : null;
  };

  // The foot-of-card headline. `value` is the displayed number (fantasy points in
  // Fantasy mode, the magnitude score in Regular); `pct` drives the tier color and
  // `scale` selects which palette function colors it ("score" → tierColorScore for
  // the magnitude scale; "percentile" → tierColor for fantasy ranks).
  const scopedComposite = (): { value: string; pct: number; label: string; scale: "score" | "percentile" } => {
    if (ctx.scoreModel() === "fantasy") {
      const f = fantasyView();
      const s = ctx.scope();
      const pct = s !== "all" && f?.scoped_ranks?.[s] != null ? f.scoped_ranks[s] : (f?.rank ?? 0);
      return { value: f?.points != null ? `${f.points.toFixed(1)} pts` : "—", pct, label: "Fantasy", scale: "percentile" };
    }
    const v = view();
    const s = ctx.scope();
    // Magnitude is players-only; TEAMS keep the percentile RANK (tierColor).
    if (ctx.type() === "team") {
      const rank = scopedRank(v, s);
      const label = s !== "all" && v?.scoped_ranks?.[s] != null
        ? `${compositeLabel()} · ${SCOPE_LABEL[s] ?? s}`
        : compositeLabel();
      return { value: String(rank), pct: rank, label, scale: "percentile" };
    }
    // Players: headline shows the magnitude SCORE (0-100, ~50 = average); its tier
    // color reads the same score. Scope-suffix the label when a cohort score is shown.
    const score = scopedScore(v, s);
    const label = s !== "all" && v?.scoped_scores?.[s] != null
      ? `${compositeLabel()} · ${SCOPE_LABEL[s] ?? s}`
      : compositeLabel();
    return { value: score.toFixed(1), pct: score, label, scale: "score" };
  };

  return (
    <Show when={rating()} fallback={<EmptyCard message="No rating yet." />}>
      {(_r) => (
        <Show when={pizzaGroups().length > 0} fallback={<EmptyCard message="No rating yet." />}>
          <div class="composite-stack">
            <div class="composite-facets">
              <For each={pizzaGroups()}>
                {(g, i) => (
                  <FacetFrame first={i() === 0} label={g.label}>
                    <div class="stats-cell">
                      {/* Offense/Defense marker at the top — only for multi-facet
                          entities (teams). The per-card RATING readout was dropped
                          (redundant with the meta-header rating chip). */}
                      <Show when={pizzaGroups().length > 1}>
                        <p class="category-chart-label">{g.label}</p>
                      </Show>
                      <div class="stats-pizza-chart">
                        <PizzaChart stats={g.stats} intenseHover options={CHART_OPTS} />
                      </div>
                      {/* Fantasy mode keeps its points headline at the foot; Regular
                          mode drops the per-card rating (redundant with the meta chip). */}
                      <Show when={ctx.scoreModel() === "fantasy"}>
                        <p class="category-chart-label overall-score-line">
                          <span class="overall-score-content">
                            {scopedComposite().label}{": "}
                            <span style={{ color: tierColor(scopedComposite().pct) }}>
                              {scopedComposite().value}
                            </span>
                          </span>
                        </p>
                      </Show>
                    </div>
                  </FacetFrame>
                )}
              </For>
            </div>
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
  const aData = createAsync(() => getStats(sport(), type(), ctx.id(), ctx.season()));
  const bData = createAsync(() => getStats(sport(), type(), ctx.vs()!, ctx.season()));
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
        leftValue: da?.value ?? null, leftPercentile: da ? scopePct(da, scope) : null,
        rightValue: db?.value ?? null, rightPercentile: db ? scopePct(db, scope) : null,
      };
    });
  };

  return (
    <Show when={aView() && bView()} fallback={<EmptyCard message="No rating to compare." />}>
      <Card id="stats" as="article" aria-label="Compare">
        <div class="stats-cell">
          <div class="compare-headers">
            <div class="compare-header compare-header-left">
              <span class="compare-name">
                <span class="compare-key compare-key-primary" aria-hidden="true" />
                {aMeta()?.name ?? ""}
              </span>
              <span class="compare-score" style={{ color: type() === "team" ? tierColor(scopedRank(aView(), ctx.scope())) : tierColorScore(scopedScore(aView(), ctx.scope())) }}>
                {type() === "team" ? String(scopedRank(aView(), ctx.scope())) : scopedScore(aView(), ctx.scope()).toFixed(1)}
              </span>
            </div>
            <span class="compare-vs">vs</span>
            <div class="compare-header compare-header-right">
              <span class="compare-name">
                {bMeta()?.name ?? ""}
                <span class="compare-key compare-key-secondary" aria-hidden="true" />
              </span>
              <span class="compare-score" style={{ color: type() === "team" ? tierColor(scopedRank(bView(), ctx.scope())) : tierColorScore(scopedScore(bView(), ctx.scope())) }}>
                {type() === "team" ? String(scopedRank(bView(), ctx.scope())) : scopedScore(bView(), ctx.scope()).toFixed(1)}
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

export default function StatsCard() {
  const ctx = useProfile();
  return (
    <Show when={ctx.vs()} fallback={<CompositeView />}>
      <CompareView />
    </Show>
  );
}

export function StatsCardSkeleton() {
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
