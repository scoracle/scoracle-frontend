/**
 * VibeCard — The Influencer's card (Characters Phase 1, 2026-07-22): the
 * felt, emotional read of the discourse. Each read leads with its HOOK as
 * the title (vibe_scores.hook, mig 180) over the felt-read prose, latest
 * first. Uniform card contract (2026-08-21): title + text only — the tiered
 * numerals and the time/trigger ledger retired as noise.
 *
 * Hydrates from its OWN product endpoint as of 2026-08-22 — the "flagged
 * follow-up" this docstring carried since 2026-07-22. It previously rode the
 * *Analyst's* momentum payload, reading her snapshots out of `vibes.snapshots`,
 * because the O14 convergence rename handed the per-entity `/vibes` path to the
 * Oracle's `/sigil` and left the Influencer without a door. She never stopped
 * writing; only the route was missing.
 *
 * Extracted from the old News hub's vibe facet.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getVibe, type VibeSnapshot } from "../../lib/data/vibe.server";
import GemmaSummary from "./GemmaSummary";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./VibeCard.css";

// vibe_scores.trigger_type (backend migration 035) → client-facing read label.
// The title fallback for pre-hook rows.
const VIBE_TRIGGER_LABELS: Record<string, string> = {
  milestone: "Milestone",
  periodic: "Scheduled read",
  news_spike: "News spike",
  manual: "Manual read",
};

const triggerLabel = (v: VibeSnapshot): string =>
  VIBE_TRIGGER_LABELS[v.trigger_type] ?? v.trigger_type;

// Portrait-card fit cap (the card token never scrolls or crops): four reads,
// title + prose each, fill the silhouette. Reads without prose contribute
// nothing textual — they sit out.
const MAX_READS = 4;

export default function VibeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // No season param: her reads are a rolling 7-day window, not a season slice.
  // Riding /momentum used to drag one in whether it meant anything here or not.
  const vibe = createAsync(() => getVibe(sport(), type(), id()));

  const reads = () =>
    [...(vibe()?.snapshots ?? [])]
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      .filter((r) => r.body)
      .slice(0, MAX_READS);

  // The Influencer's card score — the lead (latest) read's sentiment.
  // Centralized in deck-scores.ts (createDeckScoreReader), read by the ring too.
  const leadSentiment = createDeckScoreReader(ctx, "vibe");

  const emptyMessage = () =>
    vibe() ? "No vibe reads this week." : "No vibe reads yet.";

  return (
    <Show when={reads().length > 0} fallback={<EmptyCard message={emptyMessage()} />}>
      <Card id="vibe" as="article" aria-label="Vibe" class="vibe-feed-card" score={leadSentiment}>
        <p class="card-identifier">Past week vibe reads, latest first</p>

        <div class="vibe-reads">
          <For each={reads()}>
            {(r) => (
              <article class="vibe-read">
                <h3 class="vibe-hook">{r.headline ?? triggerLabel(r)}</h3>
                <GemmaSummary text={r.body!} class="vibe-felt-read" />
              </article>
            )}
          </For>
        </div>
      </Card>
    </Show>
  );
}
