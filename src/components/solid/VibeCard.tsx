/**
 * VibeCard — The Influencer's card (Characters Phase 1, 2026-07-22): the
 * felt, emotional read of the discourse. The latest read leads the card —
 * its HOOK as the title (vibe_scores.hook, mig 180), the felt-read prose,
 * the tier-colored sentiment score — with the rest of the past week's reads
 * as compact rows beneath.
 *
 * Rides the momentum payload's fixed 7-day snapshot window (the same query
 * the meta card's Vibe chip resolves, so it lands cache-warm). A dedicated
 * /vibe product endpoint is the flagged follow-up (products self-contained);
 * extracted from the old News hub's vibe facet.
 */

import { For, Show, createSignal, onMount } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getMomentum, type MomentumVibeSnapshot } from "../../lib/data/momentum.server";
import { tierColor } from "../../lib/utils/tier-color";
import { formatDate, formatRelativeTime } from "../../lib/utils/date";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./NarrativesCard.css";
import "./VibeCard.css";

// vibe_scores.trigger_type (backend migration 035) → client-facing read label.
// The title fallback for pre-hook rows, and the label on the past-reads rows.
const VIBE_TRIGGER_LABELS: Record<string, string> = {
  milestone: "Milestone",
  periodic: "Scheduled read",
  news_spike: "News spike",
  manual: "Manual read",
};

const triggerLabel = (v: MomentumVibeSnapshot): string =>
  VIBE_TRIGGER_LABELS[v.trigger_type] ?? v.trigger_type;

// Portrait-card fit cap: the lead read (title + prose + score) carries the
// card; the trailing reads are compact rows, capped so the token holds its
// silhouette.
const MAX_PAST_READS = 4;

export default function VibeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const momentum = createAsync(() => getMomentum(sport(), type(), id(), ctx.season()));

  const reads = () =>
    [...(momentum()?.vibes.snapshots ?? [])]
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  const lead = () => reads()[0] ?? null;
  const pastReads = () => reads().slice(1, 1 + MAX_PAST_READS);

  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const readTime = (at: string) => (mounted() ? formatRelativeTime(at) : formatDate(at));

  const emptyMessage = () =>
    momentum() ? "No vibe reads this week." : "No vibe reads yet.";

  return (
    <Show when={lead()} fallback={<EmptyCard message={emptyMessage()} />} keyed>
      {(v) => (
        <Card id="vibe" as="article" aria-label="Vibe" class="vibe-feed-card">
          <p class="card-identifier">Past week vibe reads, latest first</p>

          {/* The lead read: HOOK as the title (trigger label on pre-hook
              rows), sentiment beside it, the felt read in full below. */}
          <article class="vibe-lead">
            <header class="vibe-lead-head">
              <h3 class="vibe-hook">{v.hook ?? triggerLabel(v)}</h3>
              <span class="vibe-lead-score" style={{ color: tierColor(v.sentiment) }}>
                {Math.round(v.sentiment)}
              </span>
            </header>
            <div class="news-meta">
              {/* Pre-hook rows title with the trigger label — don't repeat it. */}
              <Show when={v.hook}>
                <span>{triggerLabel(v)}</span>
              </Show>
              <span>Read {readTime(v.generated_at)}</span>
            </div>
            <Show when={v.blurb}>
              {(blurb) => <GemmaSummary text={blurb()} class="vibe-felt-read" />}
            </Show>
          </article>

          {/* The rest of the week, compact: label · time · score. */}
          <Show when={pastReads().length > 0}>
            <ol class="vibe-past-reads">
              <For each={pastReads()}>
                {(r) => (
                  <li class="vibe-past-read">
                    <span class="vibe-past-read-label">{r.hook ?? triggerLabel(r)}</span>
                    <span class="vibe-past-read-time">{readTime(r.generated_at)}</span>
                    <span class="vibe-past-read-score" style={{ color: tierColor(r.sentiment) }}>
                      {Math.round(r.sentiment)}
                    </span>
                  </li>
                )}
              </For>
            </ol>
          </Show>
        </Card>
      )}
    </Show>
  );
}
