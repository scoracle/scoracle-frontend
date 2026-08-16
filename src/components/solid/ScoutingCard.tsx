/**
 * ScoutingCard — The Scout's card (Characters Phase 1, 2026-07-22): the one
 * turn that merges the retired StatsCard + RatingCard. The composite pizza on
 * top — presentation-only (hover retired), still reactive to the scope
 * conditions — and the Gemma scouting report (`rating.commentary.body`)
 * below. No hero strength label/number: the pizza shows the spread, the
 * report tells the read.
 *
 * Each composite datapoint (the `in_comp` rows of rating_breakdown) becomes a
 * wedge sized + colored by its 0-100 `pct` (store z, draw the percentile).
 *
 * The rating IS z-scores, so the DEFAULT card renders one pizza from the z-score
 * breakdown (rating_breakdown). NFL OFFENSIVE PLAYERS are the lone default
 * template outlier: their counting-stat template is the default stats card
 * (QB attempts/yards/TDs etc.). The Fantasy model swaps any fantasy-supported
 * entity to its counting-stat template + fantasy headline. Facets remain slice
 * categories, not separate cards.
 *
 * Compare: when `ctx.vs` is set the WHOLE card switches to the
 * <ButterflyChart> — one mirror-halves wheel, the primary on the left
 * semicircle and the vs entity on the right, the report comes off. Both
 * entities get the SAME per-X mode + scope (fetched via getStats, run
 * through ratingForMode).
 *
 * Reads getStats → rating.rating_breakdown (pizza) + getRating → commentary
 * (the report). Empty when the entity is unrated; missing commentary renders
 * a quiet placeholder in the report slot (backfill coming).
 */

import { Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getStats, ratingForMode, fantasyForMode, templateForMode,
  type RatingDatapoint, type RatingView, type FantasyBlock, type TemplateStat,
} from "../../lib/data/stats.server";
import { getRating } from "../../lib/data/rating.server";
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
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./ScoutingCard.css";

// ONE geometry for both the pizza and the compare butterfly, so the two
// card faces read as the same wheel. The disk's rendered size is
// outerRadius over total viewBox width, and both charts now compute their
// own horizontal label margin from the placed labels (short labels sit at
// 3/9 o'clock, long ones at 12/6) — as tight as the data allows, so the
// disk commands the portrait card. Height 500 bounds the disk + label band
// exactly (210 + 16 + label text ≈ 250 per half): no internal empty bands.
// innerRadius 0: true slices, no hole.
const CHART_OPTS = { width: 400, height: 500, innerRadius: 0, outerRadius: 210, labelOffset: 16 };
const PIZZA_FACETS = ["offense", "defense", "special", "all"];
const SCOPE_LABEL: Record<string, string> = {
  position: "Position", conference: "Conference", division: "Division", league: "League",
};

const scopeLens = (scope: string): string =>
  scope === "all" ? "league scope" : `${(SCOPE_LABEL[scope] ?? scope).toLowerCase()} scope`;

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
 *  0-100 score scale.) */
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

/* Describer vocabulary — the card states its scope in one sentence:
 * "Regular season stats, compared to attackers, per 90." */
const RATE_PHRASE: Record<string, string> = {
  per_36: "per 36",
  per_90: "per 90",
  per_game: "per game",
  per_season: "per season",
};
/* What "default" means per sport (mirrors ReadingTable's RATE_OPTIONS). */
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

/** Single-entity view — the pizza over the scouting report. */
function ScoutingView() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getStats(sport(), type(), id(), ctx.season()));
  // The report rides the lean rating payload; season selection swaps it (the
  // read is per entity-season).
  const report = createAsync(() => getRating(sport(), type(), id(), ctx.season()));

  const rating = () => data()?.rating ?? null;
  const view = () => {
    const r = rating();
    return r ? ratingForMode(r, ctx.rateMode()) : null;
  };

  const commentary = () => report()?.commentary ?? null;

  const pizzaDatapoints = () => (view()?.breakdown ?? []).filter(eligible);

  const nflSide = () =>
    sport() === "nfl" && type() === "player" ? nflSideOfBall(rating()?.position) : null;

  const filteredPizzaDatapoints = () => {
    const side = nflSide();
    return pizzaDatapoints()
      .filter((d) => !side || d.facet === side)
      .sort((a, b) => PIZZA_FACETS.indexOf(a.facet) - PIZZA_FACETS.indexOf(b.facet));
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
  // The one pizza to render: template wedges when a template is active, otherwise
  // z-score wedges. Facets remain category colors inside the single card instead
  // of splitting into multiple cards.
  const pizzaStats = (): PizzaChartStat[] => {
    const tmpl = template();
    if (tmpl && tmpl.length > 0) {
      return tmpl.map((t) => toTemplateStat(t, ctx.scope()));
    }
    return filteredPizzaDatapoints().map((d) => toStat(d, ctx.scope()));
  };

  // Fantasy headline for the active rate mode (null when the entity/sport has none).
  const fantasyView = (): FantasyBlock | null => {
    const r = rating();
    return r ? fantasyForMode(r, ctx.rateMode()) : null;
  };

  // The fantasy foot-of-card headline: points + scoped rank tier color. (The
  // Regular-model card carries no per-card number — the pizza and the report
  // are the content; the composite rating lives on the meta chip.)
  const fantasyHeadline = (): { value: string; pct: number } | null => {
    if (ctx.scoreModel() !== "fantasy") return null;
    const f = fantasyView();
    const s = ctx.scope();
    const pct = s !== "all" && f?.scoped_ranks?.[s] != null ? f.scoped_ranks[s] : (f?.rank ?? 0);
    return { value: f?.points != null ? `${f.points.toFixed(1)} pts` : "—", pct };
  };

  // The Scout's card score — the BASELINE (unscoped) composite. Centralized
  // in deck-scores.ts (createDeckScoreReader); the meta-card ring reads the
  // same derivation so the head slot and the ring can never disagree.
  const cardScore = createDeckScoreReader(ctx, "scouting");

  // The scope sentence, assembled from the active view controls: model,
  // cohort (position group by name when scoped by position), rate.
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
    <Show when={rating()} fallback={<EmptyCard message="No rating yet." />}>
      {(_r) => (
        <Show when={pizzaStats().length > 0} fallback={<EmptyCard message="No rating yet." />}>
          <Card id="scouting" as="article" class="scouting-card" aria-label="Scouting" score={cardScore}>
            <p class="card-identifier">{statsDescriber()}</p>
            <div class="stats-cell">
              <div class="stats-pizza-chart">
                <PizzaChart stats={pizzaStats()} options={CHART_OPTS} />
              </div>
              {/* Fantasy mode keeps its points headline at the foot of the
                  chart cell; Regular mode carries no per-card number. */}
              <Show when={fantasyHeadline()} keyed>
                {(f) => (
                  <p class="card-eyebrow category-chart-label overall-score-line">
                    <span class="overall-score-content">
                      {"Fantasy: "}
                      <span style={{ color: tierColor(f.pct) }}>{f.value}</span>
                    </span>
                  </p>
                )}
              </Show>
            </div>
            {/* The Scout's report. Missing commentary (backfill pending) gets a
                quiet placeholder — the slot holds, nobody narrates over it. */}
            <Show
              when={commentary()}
              fallback={<p class="scouting-report-pending">Scouting report pending.</p>}
            >
              {(c) => <GemmaSummary text={c().body} class="scouting-report" />}
            </Show>
          </Card>
        </Show>
      )}
    </Show>
  );
}

/** Compare view — the butterfly takes the whole card (report off). Primary on
 *  the left semicircle, the vs entity on the right; both run through the SAME
 *  per-X mode + scope. */
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
      {/* No `score` here: two entities share the face, so there is no single
          draw — the compare card keeps corner dots and no slot. */}
      <Card id="scouting" as="article" aria-label="Compare">
        <p class="card-identifier">{compareIdentifier()}</p>
        {/* Names row anchors under the describer (a sibling of the centered
            cell, not inside it) so the butterfly alone claims the remaining
            silhouette — same visual command as the single pizza. */}
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
        <div class="stats-cell">
          <div class="stats-pizza-chart">
            <ButterflyChart stats={stats()} options={CHART_OPTS} />
          </div>
        </div>
      </Card>
    </Show>
  );
}

export default function ScoutingCard() {
  const ctx = useProfile();
  return (
    <Show when={ctx.vs()} fallback={<ScoutingView />}>
      <CompareView />
    </Show>
  );
}
