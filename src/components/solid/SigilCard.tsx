/**
 * SigilCard — the entity's standout skill (the sigil) + its strengths
 * and weaknesses. The spiritual descendant of the Traits tab, kept at a standard,
 * share-friendly card size.
 *
 * The hero is the `is_specialty` datapoint (the engine's peak z) — shown bold with
 * its tier-colored percentile. An intro line ("{name}'s standout skill:") orients
 * the reader. Below, a grid of the other `in_spec` skills capped to the top-3
 * strengths + bottom-3 weaknesses so the card always fits (≤6 → all shown).
 *
 * Reads getSigil → rating.rating_breakdown + commentary (+ getEntityMeta for the name).
 * Illustrations come from sigil-art (placeholders until real art lands).
 */

import { For, Show, createMemo } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getSigil, type RatingDatapoint } from "../../lib/data/sigil.server";
import { artFor } from "../../lib/utils/sigil-art";
import { tierColor } from "../../lib/utils/tier-color";
import { getPositionGroup, nflSideOfBall } from "../../lib/utils/position-groups";
import { getEntityMeta } from "./EntityMeta";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./SigilCard.css";

export default function SigilCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getSigil(sport(), type(), id(), ctx.season()));

  // Entity name for the intro line ("{name}'s standout skill:"). Same warm query
  // EntityMeta uses, resolved server-side, so it's right on first paint.
  const meta = createAsync(() => getEntityMeta(sport(), type(), id()));
  const entityName = () => meta()?.name ?? "";

  // The Gemma on-field identity analysis (stats-rail narrative) — the actual
  // read, not a strengths/weaknesses list. Rides in the sigil payload; null
  // until the backfill reaches this entity-season.
  const commentary = () => data()?.commentary ?? null;

  const rating = () => data()?.rating ?? null;
  // Per-X mode breakdown (players): the alternate mode re-picks the peak skill +
  // re-scores every datapoint. "default" / teams → the season-total breakdown.
  // (Sigil is the lean product — only the breakdown matters here, no need for
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
  // Hero label: Gemma's divined sigil when available (prompt s3+), else the engine's
  // pre-computed label. Art lookup always uses the breakdown label so the icon stays
  // stable even when Gemma reframes the label slightly.
  const heroLabel = (breakdownLabel: string) =>
    commentary()?.divined_sigil ?? breakdownLabel;

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
  const others = createMemo(() => {
    const h = hero();
    return breakdown()
      .filter((d) => d.in_spec && d !== h)
      .sort((a, c) => c.pct - a.pct);
  });

  // Keep the card a standard, share-friendly size: when there are more skills than
  // fit, show only the top-3 strengths + bottom-3 weaknesses (the traits tab's
  // spirit). ≤6 → show them all.
  const shown = () => {
    const o = others();
    return o.length <= 6 ? o : [...o.slice(0, 3), ...o.slice(-3)];
  };

  return (
    <Show when={hero()} keyed fallback={<EmptyCard message="No sigil rating yet." />}>
      {(h) => {
        const HeroArt = artFor(h.label);
        return (
          <Card id="sigil" as="article" aria-label="Sigil">
            <div class="sigil-card">
              <p class="sigil-intro">
                {entityName() ? `${entityName()}'s standout skill:` : "Standout skill:"}
              </p>
              <div class="sigil-hero" style={{ color: tierColor(h.pct) }}>
                <div class="sigil-hero-art">{HeroArt()}</div>
                <h3 class="sigil-hero-label">{heroLabel(h.label)}</h3>
                <p class="sigil-hero-pct">{h.pct.toFixed(1)}</p>
              </div>

              <Show when={commentary()}>
                {(c) => <GemmaSummary text={c().body} class="sigil-commentary" />}
              </Show>

              <Show when={shown().length > 0}>
                <div class="sigil-grid">
                  <For each={shown()}>
                    {(d) => {
                      const Art = artFor(d.label);
                      return (
                        <div class="sigil-grid-item" style={{ color: tierColor(d.pct) }}>
                          <div class="sigil-grid-art">{Art()}</div>
                          <span class="sigil-grid-label">{d.label}</span>
                          <span class="sigil-grid-pct">{d.pct.toFixed(1)}</span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </Card>
        );
      }}
    </Show>
  );
}

export function SigilCardSkeleton() {
  return (
    <Shell as="article" aria-label="Sigil">
      <div class="sigil-card">
        <Skeleton shape="line" width={96} height={96} />
        <Skeleton shape="line" width={160} height={22} />
        <Skeleton shape="line" width={220} height={12} />
        <Skeleton shape="line" width={300} height={60} />
      </div>
    </Shell>
  );
}
