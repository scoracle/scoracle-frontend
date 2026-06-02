/**
 * SpecialistCard — the entity's PEAK skill (the specialty) + its value/scarcity,
 * with every specialist datapoint illustrated.
 *
 * The hero is the `is_specialty` datapoint (the engine's peak z). Its scarcity
 * line tiers on rating_specialist_rank — the peak's standing among everyone's
 * peak skill (so a #1 reads "the single most valuable skill in the sport"). A
 * secondary grid shows the other `in_spec` skills by percentile.
 *
 * Reads getStarline → rating.rating_breakdown. Illustrations come from
 * specialist-art (placeholders until real art lands). Plumbing baseline.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getStarline } from "../../lib/data/starline.server";
import { artFor } from "../../lib/utils/specialist-art";
import { tierColor } from "../../lib/utils/tier-color";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./SpecialistCard.css";

/** Scarcity copy tiered on the peak's cross-player standing (rating_specialist_rank). */
function scarcity(rank: number): string {
  if (rank >= 99) return "the single most valuable skill in the sport";
  if (rank >= 95) return "a top-5% skill in the sport";
  if (rank >= 90) return "an elite, rare skill";
  if (rank >= 75) return "a standout strength";
  return "their defining skill";
}

export default function SpecialistCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getStarline(sport, type, id, ctx.season()));

  const rating = () => data()?.rating ?? null;
  const hero = () => (rating()?.rating_breakdown ?? []).find((d) => d.is_specialty) ?? null;
  const others = () =>
    (rating()?.rating_breakdown ?? [])
      .filter((d) => d.in_spec && !d.is_specialty)
      .sort((a, b) => b.pct - a.pct);

  return (
    <Show when={rating() && hero()} fallback={<EmptyCard message="No specialist rating yet." />}>
      {(_present) => {
        const r = rating()!;
        const h = hero()!;
        const HeroArt = artFor(h.label);
        return (
          <Shell as="article" aria-label="Specialist">
            <div class="specialist-card">
              <div class="specialist-hero" style={{ color: tierColor(r.rating_specialist_rank) }}>
                <div class="specialist-hero-art">{HeroArt()}</div>
                <h3 class="specialist-hero-label">{h.label}</h3>
                <p class="specialist-hero-scarcity">{scarcity(r.rating_specialist_rank)}</p>
                <p class="specialist-hero-pct">
                  {Math.round(r.rating_specialist_rank)}
                  <span class="specialist-hero-pct-unit">/100</span>
                </p>
              </div>

              <Show when={others().length > 0}>
                <div class="specialist-grid">
                  <For each={others()}>
                    {(d) => {
                      const Art = artFor(d.label);
                      return (
                        <div class="specialist-grid-item" style={{ color: tierColor(d.pct) }}>
                          <div class="specialist-grid-art">{Art()}</div>
                          <span class="specialist-grid-label">{d.label}</span>
                          <span class="specialist-grid-pct">{Math.round(d.pct)}</span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </Shell>
        );
      }}
    </Show>
  );
}

export function SpecialistCardSkeleton() {
  return (
    <Shell as="article" aria-label="Specialist">
      <div class="specialist-card">
        <Skeleton shape="line" width={96} height={96} />
        <Skeleton shape="line" width={160} height={22} />
        <Skeleton shape="line" width={220} height={12} />
        <Skeleton shape="line" width={300} height={60} />
      </div>
    </Shell>
  );
}
