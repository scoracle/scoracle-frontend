import { useProfileReads, useProfileRead } from "../lib/profile-products";
/**
 * ScoutingCard — The Scout's card: scouting blurb (headline) at the top,
 * the composite pizza chart under the per-x conditions (model / rate / cohort
 * scope / season) in the middle, and the body of the scouting report below;
 * switches to the compare butterfly when `?vs=` is set.
 */
import { Show, createMemo } from "solid-js";
import { useProfile } from "../lib/profile-context";
import { ratingForMode, templateForMode, eligiblePizzaDatapoints, PIZZA_FACETS, type RatingDatapoint, type RatingView, type TemplateStat } from "../lib/data/stats";
import PizzaChart, { type PizzaChartStat } from "./PizzaChart";
import ButterflyChart, { type ButterflyStat } from "./ButterflyChart";
import { tierColor, tierColorScore } from "../lib/utils/tier-color";
import { nflSideOfBall } from "../lib/utils/position-groups";
import { createDeckScoreReader } from "../lib/deck-scores";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./ScoutingCard.css";

// Both charts measure the card cell and use the same CSS-pixel typography.
// These dimensions are the pre-measurement/SSR fallback.
const PIZZA_OPTS = { width: 360, height: 280, innerRadius: 0, labelOffset: 14 };
const COMPARE_OPTS = { width: 400, height: 620, innerRadius: 0, labelOffset: 14 };

/** Raw volume — the underlying counting stat, shown under each wedge. */
const vol = (v: number | null): string => (v == null ? "—" : String(v));

/** Slice percentile honoring the active cohort scope (migrations 043 + 058). */
const scopePct = (s: {
    pct: number;
    scoped_pct?: Record<string, number> | null;
}, scope: string): number => s.scoped_pct?.[scope] ?? s.pct;

/** Datapoint → pizza wedge: scoped percentile drives the slice; raw VOLUME is the sub-label. */
function toStat(d: RatingDatapoint, scope: string): PizzaChartStat {
    return { key: d.label, label: d.label, value: vol(d.value), percentile: scopePct(d, scope), categoryId: d.facet };
}

function scopedScore(v: RatingView | null, scope: string): number {
    if (v && scope !== "all" && v.scoped_scores?.[scope] != null)
        return v.scoped_scores[scope];
    return v?.composite_score ?? 0;
}

function scopedRank(v: RatingView | null, scope: string): number {
    if (v && scope !== "all" && v.scoped_ranks?.[scope] != null)
        return v.scoped_ranks[scope];
    return v?.composite_rank ?? 0;
}

/** Single-entity view — scouting blurb above the pizza chart, report body below. */
function ScoutingView() {
    const ctx = useProfile();
    const { sport, type } = ctx;
    const data = useProfileRead("stats");
    const report = useProfileRead("report");
    const commentary = () => report()?.commentary ?? null;
    const rating = () => data()?.rating ?? null;
    const view = () => {
        const r = rating();
        return r ? ratingForMode(r, ctx.rateMode()) : null;
    };
    const pizzaDatapoints = () => eligiblePizzaDatapoints(view());
    const nflSide = () => sport() === "nfl" && type() === "player" ? nflSideOfBall(rating()?.position) : null;
    const filteredPizzaDatapoints = createMemo(() => {
        const side = nflSide();
        return pizzaDatapoints()
            .filter((d) => !side || d.facet === side)
            .sort((a, b) => PIZZA_FACETS.indexOf(a.facet) - PIZZA_FACETS.indexOf(b.facet));
    });
    const template = () => {
        const r = rating();
        if (!r)
            return null;
        const t = templateForMode(r, ctx.rateMode());
        if (!t || t.length === 0)
            return null;
        if (ctx.scoreModel() === "fantasy")
            return t;
        return sport() === "nfl" && type() === "player" ? t : null;
    };
    const toTemplateStat = (t: TemplateStat, scope: string): PizzaChartStat => ({
        key: t.key, label: t.label, value: vol(t.value), percentile: scopePct(t, scope), categoryId: t.facet ?? "all",
    });
    const pizzaStats = createMemo((): PizzaChartStat[] => {
        const tmpl = template();
        if (tmpl && tmpl.length > 0) {
            return tmpl.map((t) => toTemplateStat(t, ctx.scope()));
        }
        return filteredPizzaDatapoints().map((d) => toStat(d, ctx.scope()));
    });
    const hasPizza = () => rating() != null && pizzaStats().length > 0;
    const hasReport = () => commentary()?.body != null;
    const cardScore = createDeckScoreReader(ctx, useProfileReads(), "scouting");
    return (<Show when={hasPizza() || hasReport()} fallback={<EmptyCard message="No scouting report yet."/>}>
      <Card id="scouting" as="article" class="scouting-card" aria-label="Scouting" score={cardScore}>
        <p class="card-identifier">The Scout's report</p>
        <Show when={commentary()?.headline}>
          <h2 class="card-hook">{commentary()!.headline}</h2>
        </Show>
        <Show when={hasPizza()}>
          <div class="stats-cell">
            <div class="stats-pizza-chart">
              <PizzaChart stats={pizzaStats()} options={PIZZA_OPTS}/>
            </div>
          </div>
        </Show>
        <Show when={commentary()?.body} fallback={<p class="card-text-pending">Scouting report pending.</p>}>
          {(body) => <GemmaSummary text={body()} class="scouting-report"/>}
        </Show>
      </Card>
    </Show>);
}

/** Compare view — the butterfly takes the whole card. Primary on the left
 *  semicircle, the vs entity on the right; both run through the SAME per-X
 *  mode + scope. */
function CompareView() {
    const ctx = useProfile();
    const { type } = ctx;
    const aData = useProfileRead("stats");
    const bData = useProfileRead("comparisonStats");
    const aMeta = useProfileRead("meta");
    const bMeta = useProfileRead("comparisonMeta");
    const aView = () => { const r = aData()?.rating; return r ? ratingForMode(r, ctx.rateMode()) : null; };
    const bView = () => { const r = bData()?.rating; return r ? ratingForMode(r, ctx.rateMode()) : null; };
    const stats = createMemo((): ButterflyStat[] => {
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
    });
    return (<Show when={aView() && bView()} fallback={<EmptyCard message="No rating to compare."/>}>
      <Card id="scouting" as="article" class="scouting-card profile-chart-card" aria-label="Compare">
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
            <ButterflyChart stats={stats()} options={COMPARE_OPTS}/>
          </div>
        </div>
      </Card>
    </Show>);
}

export default function ScoutingCard() {
    const ctx = useProfile();
    return (<Show when={ctx.vs()} fallback={<ScoutingView />}>
      <CompareView />
    </Show>);
}
