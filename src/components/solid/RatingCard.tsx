/**
 * RatingCard — the entity's greatest strength, highlighted, over the Gemma
 * scouting report. Two beats, nothing else: the hero is the `is_specialty`
 * datapoint (the engine's peak z) with the tier-colored rating magnitude, and
 * the commentary IS the content. Skill grids and recent-form trajectory were
 * cut 2026-07-11 — the per-skill spread lives on the Stats pizza and form
 * lives on the Momentum card.
 *
 * Reads getRating → rating.rating_breakdown + commentary (+ getEntityMeta for the name).
 */

import { Show, createMemo } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getRating, type RatingDatapoint } from "../../lib/data/rating.server";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import { getPositionGroup, nflSideOfBall } from "../../lib/utils/position-groups";
import { getEntityMeta } from "./EntityMeta";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./RatingCard.css";

export default function RatingCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getRating(sport(), type(), id(), ctx.season()));

  // Entity name for the intro line ("{name}'s standout skill:"). Same warm query
  // EntityMeta uses, resolved server-side, so it's right on first paint.
  const meta = createAsync(() => getEntityMeta(sport(), type(), id()));
  const entityName = () => meta()?.name ?? "";

  // The Gemma on-field identity analysis (stats-rail narrative) — the actual
  // read, not a strengths/weaknesses list. Rides in the rating payload; null
  // until the backfill reaches this entity-season.
  const commentary = () => data()?.commentary ?? null;

  const rating = () => data()?.rating ?? null;
  const seasonCorner = () => {
    const season = data()?.season ?? rating()?.season ?? commentary()?.season ?? ctx.season();
    return season != null ? String(season) : undefined;
  };
  // Rating headline = the positionless magnitude (players: rating_composite_score
  // T-score; teams: rating_composite_rank percentile) — symmetric with the Vibe's
  // sentiment score. The blurb + grid below name the statistical strengths.
  const magnitude = createMemo<number | null>(() => {
    const r = rating();
    if (!r) return null;
    return type() === "team" ? r.rating_composite_rank : r.rating_composite_score;
  });
  // Per-X mode breakdown (players): the alternate mode re-picks the peak skill +
  // re-scores every datapoint. "default" / teams → the season-total breakdown.
  // (Rating is the lean product — only the breakdown matters here, no need for
  // the full ratingForMode view.)
  const view = () => {
    const r = rating();
    if (!r) return null;
    const m = ctx.rateMode() !== "default" ? r.rating_modes?.[ctx.rateMode()] : undefined;
    return { breakdown: m?.breakdown ?? r.rating_breakdown };
  };

  // Football display rules (DISPLAY-ONLY — the rating engine is untouched, this only
  // filters what the card shows). The engine pools goalkeepers with outfield players,
  // so each was showing the other's stats as 0-pct "weaknesses". So:
  //   • outfield players hide the goalkeeping datapoints,
  //   • goalkeepers show ONLY the GK datapoints + Passing,
  //   • "Penalties Won" is demoted to display-only (kept out of the rated breakdown).
  const GK_LABELS = new Set(["Shot-Stopping", "Penalty Saves", "Punching", "High Claims"]);
  const GK_ALLOWED = new Set([...GK_LABELS, "Passing"]);
  const DISPLAY_ONLY = new Set(["Penalties Won"]);
  const isGoalkeeper = () =>
    sport() === "football" &&
    getPositionGroup("football", rating()?.position ?? "") === "goalkeeper";
  // NFL one-way players: show only their side of the ball (offense/defense/special).
  const nflSide = () =>
    sport() === "nfl" && type() === "player" ? nflSideOfBall(rating()?.position) : null;

  const relevant = (d: RatingDatapoint): boolean => {
    if (sport() === "football") {
      if (DISPLAY_ONLY.has(d.label)) return false;
      if (isGoalkeeper()) return GK_ALLOWED.has(d.label);
      return !GK_LABELS.has(d.label);
    }
    const side = nflSide();
    if (side) return d.facet === side;
    return true;
  };

  const breakdown = createMemo(() =>
    (view()?.breakdown ?? []).filter(relevant),
  );
  // Hero label: Gemma's divined peak label when available, else the engine's
  // pre-computed label. Art lookup always uses the breakdown label so the icon stays
  // stable even when Gemma reframes the label slightly.
  const heroLabel = (breakdownLabel: string) =>
    commentary()?.divined_peak ?? breakdownLabel;

  // Hero = the engine's peak skill when it survives the filter, else the highest-pct
  // remaining in_spec datapoint (so a filtered-out is_specialty never blanks the card).
  const hero = createMemo(() => {
    const b = breakdown();
    return (
      b.find((d) => d.is_specialty) ??
      [...b].filter((d) => d.in_spec).sort((a, c) => c.pct - a.pct)[0] ??
      null
    );
  });
  return (
    <Show when={hero()} keyed fallback={<EmptyCard message="No rating yet." />}>
      {(h) => {
        return (
          <Card id="rating" as="article" aria-label="Rating" cornerLabel={seasonCorner()}>
            <p class="card-identifier">
              {entityName() ? `${entityName()}'s rating — strongest in:` : "Rating — strongest in:"}
            </p>
            <div class="rating-card">
              <div
                class="rating-hero"
                style={{
                  color:
                    magnitude() != null
                      ? type() === "team"
                        ? tierColor(magnitude()!)
                        : tierColorScore(magnitude()!)
                      : tierColor(h.pct),
                }}
              >
                <h3 class="rating-hero-label">{heroLabel(h.label)}</h3>
                <p class="rating-hero-pct">
                  {magnitude() != null
                    ? type() === "team"
                      ? String(Math.round(magnitude()!))
                      : magnitude()!.toFixed(1)
                    : h.pct.toFixed(1)}
                </p>
              </div>

              <Show when={commentary()}>
                {(c) => <GemmaSummary text={c().body} class="rating-commentary" />}
              </Show>
            </div>
          </Card>
        );
      }}
    </Show>
  );
}
