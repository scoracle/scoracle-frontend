/**
 * ProfileCard — the Scout's CHART (the Scouting/Profile split, Scott
 * 2026-09-05): "a dedicated card for the pizza chart which has the per-x
 * scopes… just a visual tool." Everything visual that used to ride
 * ScoutingCard behind the ?view= flip lives here as the whole card: the
 * composite pizza under the per-x conditions (model / rate / cohort scope /
 * season), and the compare butterfly when `?vs=` is set. The prose report
 * stayed on ScoutingCard — the chart is not a scope of the report, and the
 * report is not a caption for the chart.
 *
 * Each composite datapoint (the `in_comp` rows of rating_breakdown) becomes a
 * wedge sized + colored by its 0-100 `pct` (store z, draw the percentile).
 * The rating IS z-scores, so the DEFAULT card renders the z-score breakdown;
 * NFL OFFENSIVE PLAYERS default to their counting-stat template, and the
 * Fantasy model swaps any fantasy-supported entity to its template (both
 * retire with the fantasy-built z-scores — the scope collapse).
 *
 * Chart CSS is shared with the old faces via ScoutingCard.css (the curated
 * geometry — one wheel, two cards, identical framing).
 */

import { Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getStats, ratingForMode, templateForMode,
  eligiblePizzaDatapoints, PIZZA_FACETS,
  type RatingDatapoint, type RatingView, type TemplateStat,
} from "../../lib/data/stats.server";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import ButterflyChart, { type ButterflyStat } from "./ButterflyChart";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import {
  getPositionGroup,
  getPositionGroupDisplay,
  nflSideOfBall,
} from "../../lib/utils/position-groups";
import { getEntityMeta } from "./EntityMeta";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./ScoutingCard.css";

// ONE geometry for both the pizza and the compare butterfly, so the two card
// faces read as the same wheel (see ScoutingCard.css for the rationale).
const CHART_OPTS = { width: 400, height: 500, innerRadius: 0, outerRadius: 210, labelOffset: 16 };
const SCOPE_LABEL: Record<string, string> = {
  position: "Position", conference: "Conference", division: "Division", league: "League",
};

const scopeLens = (scope: string): string =>
  scope === "all" ? "league scope" : `${(SCOPE_LABEL[scope] ?? scope).toLowerCase()} scope`;

/** Raw volume — the underlying counting stat, shown under each wedge. */
const vol = (v: number | null): string => (v == null ? "—" : String(v));

/** Slice percentile honoring the active cohort scope (migrations 043 + 058). */
const scopePct = (
  s: { pct: number; scoped_pct?: Record<string, number> | null },
  scope: string,
): number => s.scoped_pct?.[scope] ?? s.pct;

/** Datapoint → pizza wedge: scoped percentile drives the slice; raw VOLUME is the sub-label. */
function toStat(d: RatingDatapoint, scope: string): PizzaChartStat {
  return { key: d.label, label: d.label, value: vol(d.value), percentile: scopePct(d, scope), categoryId: d.facet };
}

function scopedScore(v: RatingView | null, scope: string): number {
  if (v && scope !== "all" && v.scoped_scores?.[scope] != null) return v.scoped_scores[scope];
  return v?.composite_score ?? 0;
}

function scopedRank(v: RatingView | null, scope: string): number {
  if (v && scope !== "all" && v.scoped_ranks?.[scope] != null) return v.scoped_ranks[scope];
  return v?.composite_rank ?? 0;
}

/* Describer vocabulary — the card states its scope in one sentence. */
const RATE_PHRASE: Record<string, string> = {
  per_36: "per 36",
  per_90: "per 90",
  per_game: "per game",
  per_season: "per season",
};
const DEFAULT_RATE_PHRASE: Record<string, string> = {
  nba: "per game",
  football: "per season",
  nfl: "per season",
};
const COHORT_PHRASE: Record<string, string> = {
  conference: "compared to the conference",
  division: "compared to the division",
  league: "compared to the league",
};

/** Single-entity view — the pizza alone; the chart IS the card. */
function ChartView() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getStats(sport(), type(), id(), ctx.season()));

  const rating = () => data()?.rating ?? null;
  const view = () => {
    const r = rating();
    return r ? ratingForMode(r, ctx.rateMode()) : null;
  };

  const pizzaDatapoints = () => eligiblePizzaDatapoints(view());

  const nflSide = () =>
    sport() === "nfl" && type() === "player" ? nflSideOfBall(rating()?.position) : null;

  const filteredPizzaDatapoints = () => {
    const side = nflSide();
    return pizzaDatapoints()
      .filter((d) => !side || d.facet === side)
      .sort((a, b) => PIZZA_FACETS.indexOf(a.facet) - PIZZA_FACETS.indexOf(b.facet));
  };

  const template = () => {
    const r = rating();
    if (!r) return null;
    const t = templateForMode(r, ctx.rateMode());
    if (!t || t.length === 0) return null;
    if (ctx.scoreModel() === "fantasy") return t;
    return sport() === "nfl" && type() === "player" ? t : null;
  };
  const toTemplateStat = (t: TemplateStat, scope: string): PizzaChartStat => ({
    key: t.key, label: t.label, value: vol(t.value), percentile: scopePct(t, scope), categoryId: t.facet ?? "all",
  });
  const pizzaStats = (): PizzaChartStat[] => {
    const tmpl = template();
    if (tmpl && tmpl.length > 0) {
      return tmpl.map((t) => toTemplateStat(t, ctx.scope()));
    }
    return filteredPizzaDatapoints().map((d) => toStat(d, ctx.scope()));
  };

  // The Scout's one number, shared with the Scouting report (deck-scores).
  const cardScore = createDeckScoreReader(ctx, "profile");

  const statsDescriber = () => {
    const model = ctx.scoreModel() === "fantasy" ? "Fantasy stats" : "Regular season stats";
    let cohort = "";
    const s = ctx.scope();
    if (s === "position") {
      const group = getPositionGroup(sport(), rating()?.position ?? "");
      const name = group ? getPositionGroupDisplay(group).toLowerCase() : "";
      cohort = name
        ? `compared to ${name.endsWith("s") ? name : `${name}s`}`
        : "compared by position";
    } else if (s in COHORT_PHRASE) {
      cohort = COHORT_PHRASE[s];
    }
    const rate =
      ctx.rateMode() === "default"
        ? DEFAULT_RATE_PHRASE[sport()] ?? ""
        : RATE_PHRASE[ctx.rateMode()] ?? "";
    return [model, cohort, rate].filter(Boolean).join(", ");
  };

  return (
    <Show when={rating() && pizzaStats().length > 0} fallback={<EmptyCard message="No rating yet." />}>
      <Card id="profile" as="article" class="scouting-card" aria-label="Profile" score={cardScore}>
        <p class="card-identifier">{statsDescriber()}</p>
        <div class="stats-cell">
          <div class="stats-pizza-chart">
            <PizzaChart stats={pizzaStats()} options={CHART_OPTS} />
          </div>
        </div>
      </Card>
    </Show>
  );
}

/** Compare view — the butterfly takes the whole card. Primary on the left
 *  semicircle, the vs entity on the right; both run through the SAME per-X
 *  mode + scope. */
function CompareView() {
  const ctx = useProfile();
  const { sport, type } = ctx;
  const aData = createAsync(() => getStats(sport(), type(), ctx.id(), ctx.season()));
  const bData = createAsync(() => getStats(sport(), type(), ctx.vs()!, ctx.season()));
  const aMeta = createAsync(() => getEntityMeta(sport(), type(), ctx.id()));
  const bMeta = createAsync(() => getEntityMeta(sport(), type(), ctx.vs()!));

  const aView = () => { const r = aData()?.rating; return r ? ratingForMode(r, ctx.rateMode()) : null; };
  const bView = () => { const r = bData()?.rating; return r ? ratingForMode(r, ctx.rateMode()) : null; };
  const compareIdentifier = () => `Season comparison, ${scopeLens(ctx.scope())}`;
  const stats = (): ButterflyStat[] => {
    const a = eligiblePizzaDatapoints(aView());
    const b = eligiblePizzaDatapoints(bView());
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
      {/* No `score`: two entities share the face, so there is no single draw. */}
      <Card id="profile" as="article" aria-label="Compare">
        <p class="card-identifier">{compareIdentifier()}</p>
        <div class="compare-headers">
          <div class="compare-header compare-header-left">
            <span class="compare-name">{aMeta()?.name ?? ""}</span>
            <span class="compare-score" style={{ color: type() === "team" ? tierColor(scopedRank(aView(), ctx.scope())) : tierColorScore(scopedScore(aView(), ctx.scope())) }}>
              {type() === "team" ? String(scopedRank(aView(), ctx.scope())) : scopedScore(aView(), ctx.scope()).toFixed(1)}
            </span>
          </div>
          <span class="compare-vs">vs</span>
          <div class="compare-header compare-header-right">
            <span class="compare-name">{bMeta()?.name ?? ""}</span>
            <span class="compare-score" style={{ color: type() === "team" ? tierColor(scopedRank(bView(), ctx.scope())) : tierColorScore(scopedScore(bView(), ctx.scope())) }}>
              {type() === "team" ? String(scopedRank(bView(), ctx.scope())) : scopedScore(bView(), ctx.scope()).toFixed(1)}
            </span>
          </div>
        </div>
        <div class="stats-cell">
          <div class="stats-pizza-chart">
            <ButterflyChart stats={stats()} options={CHART_OPTS} />
          </div>
        </div>
      </Card>
    </Show>
  );
}

export default function ProfileCard() {
  const ctx = useProfile();
  return (
    <Show when={ctx.vs()} fallback={<ChartView />}>
      <CompareView />
    </Show>
  );
}
