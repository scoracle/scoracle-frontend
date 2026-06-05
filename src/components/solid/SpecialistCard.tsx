/**
 * SpecialistCard — the entity's standout skill (the specialty) + its strengths
 * and weaknesses. The spiritual descendant of the Traits tab, kept at a standard,
 * share-friendly card size.
 *
 * The hero is the `is_specialty` datapoint (the engine's peak z) — shown bold with
 * its tier-colored percentile. An intro line ("{name}'s standout skill:") orients
 * the reader. Below, a grid of the other `in_spec` skills capped to the top-3
 * strengths + bottom-3 weaknesses so the card always fits (≤6 → all shown).
 *
 * Reads getSparkline → rating.rating_breakdown (+ getEntityMeta for the name).
 * Illustrations come from specialist-art (placeholders until real art lands).
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getSparkline } from "../../lib/data/sparkline.server";
import { artFor } from "../../lib/utils/specialist-art";
import { tierColor } from "../../lib/utils/tier-color";
import { getEntityMeta } from "./EntityMeta";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./SpecialistCard.css";

export default function SpecialistCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getSparkline(sport(), type(), id(), ctx.season()));

  // Entity name for the intro line ("{name}'s standout skill:"). Same warm query
  // EntityMeta uses, resolved server-side, so it's right on first paint.
  const meta = createAsync(() => getEntityMeta(sport(), type(), id()));
  const entityName = () => meta()?.name ?? "";

  const rating = () => data()?.rating ?? null;
  const hero = () => (rating()?.rating_breakdown ?? []).find((d) => d.is_specialty) ?? null;
  const others = () =>
    (rating()?.rating_breakdown ?? [])
      .filter((d) => d.in_spec && !d.is_specialty)
      .sort((a, b) => b.pct - a.pct);

  // Keep the card a standard, share-friendly size: when there are more skills than
  // fit, show only the top-3 strengths + bottom-3 weaknesses (the traits tab's
  // spirit). ≤6 → show them all.
  const shown = () => {
    const o = others();
    return o.length <= 6 ? o : [...o.slice(0, 3), ...o.slice(-3)];
  };

  return (
    <Show when={rating() && hero()} fallback={<EmptyCard message="No specialist rating yet." />}>
      {(_present) => {
        const h = hero()!;
        const HeroArt = artFor(h.label);
        return (
          <Card id="specialist" as="article" aria-label="Special">
            <div class="specialist-card">
              <p class="specialist-intro">
                {entityName() ? `${entityName()}'s standout skill:` : "Standout skill:"}
              </p>
              <div class="specialist-hero" style={{ color: tierColor(h.pct) }}>
                <div class="specialist-hero-art">{HeroArt()}</div>
                <h3 class="specialist-hero-label">{h.label}</h3>
                <p class="specialist-hero-pct">{h.pct.toFixed(1)}</p>
              </div>

              <Show when={shown().length > 0}>
                <div class="specialist-grid">
                  <For each={shown()}>
                    {(d) => {
                      const Art = artFor(d.label);
                      return (
                        <div class="specialist-grid-item" style={{ color: tierColor(d.pct) }}>
                          <div class="specialist-grid-art">{Art()}</div>
                          <span class="specialist-grid-label">{d.label}</span>
                          <span class="specialist-grid-pct">{d.pct.toFixed(1)}</span>
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

export function SpecialistCardSkeleton() {
  return (
    <Shell as="article" aria-label="Special">
      <div class="specialist-card">
        <Skeleton shape="line" width={96} height={96} />
        <Skeleton shape="line" width={160} height={22} />
        <Skeleton shape="line" width={220} height={12} />
        <Skeleton shape="line" width={300} height={60} />
      </div>
    </Shell>
  );
}
