/**
 * VibeCard — Gemma-generated 1-100 sentiment rendered as a tarot card.
 *
 * Score → one of 11 major-arcana archetypes (see ~/scoracleWiki/wiki/
 * Architecture/Vibe Score Surface.md and ./lib/vibe/archetypes.ts).
 *
 * Card / Shell split:
 *   - This file owns CONTENT: the cardBody (vibe-art + score + archetype
 *     name + subtext + credit), the corner numeral string, and the
 *     share metadata for the share artifact.
 *   - `<Shell>` owns VESSEL: border, surface, corner-numeral rendering,
 *     padding, canonical 600×348 silhouette. `<ShareTrigger>` is a
 *     sibling component rendered inside the body and positioned absolute
 *     top-right against the Shell's relative root; it dispatches via
 *     `lib/share/dispatch` (native Web Share where available, fallback
 *     modal otherwise).
 *
 * Reversal mechanic: when the score has dropped >= 4 points since the
 * user's last viewing (cached in localStorage per ./lib/vibe/reversal.ts),
 * the central illustration rotates 180° and the italic subtext gains a
 * "↓ from N" suffix. Asymmetric on purpose — quiet on the way up.
 *
 * Null state: handed off to the shared <EmptyCard> (the Veil vibe-card
 * variant + the Veil archetype's "drawn but unread" subtext) — same
 * visual every News-mode tab uses when it has nothing to show.
 */

import { createMemo, Show, type JSX } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNewsRail } from "../../lib/data/news-rail.server";
import { scoreToArchetype } from "../../lib/vibe/archetypes";
import { evaluateReversal } from "../../lib/vibe/reversal";
import { formatDate } from "../../lib/utils/date";
import { tierColor } from "../../lib/utils/tier-color";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./VibeCard.css";

export default function VibeCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // Folded onto the news rail (two-rail model): the vibe rides in the same
  // payload the News card reads — query() dedups, so this shares ONE fetch.
  const rail = createAsync(() => getNewsRail(sport(), type(), id()));
  const vibe = () => rail()?.vibe?.current ?? null;

  const reversal = createMemo(() => {
    const v = vibe();
    if (!v || v.sentiment == null) return { reversed: false, previousScore: null };
    return evaluateReversal({ sport: sport(), type: type(), id: id() }, v.sentiment);
  });

  const archetype = createMemo(() => {
    const v = vibe();
    return v && v.sentiment != null ? scoreToArchetype(v.sentiment) : null;
  });

  const cardBody = (): JSX.Element => {
    const arc = archetype();
    const row = vibe();
    if (!arc || !row || row.sentiment == null) return null;
    return (
      <article class="vibe-card">
        <div class="vibe-art" classList={{ reversed: reversal().reversed }}>
          <img src={`/vibe-art/${arc.slug}.svg`} alt="" crossorigin="anonymous" />
        </div>

        <div
          class="vibe-score"
          style={{ color: tierColor(row.sentiment as number) }}
          aria-label={`Vibe score ${row.sentiment} of 100`}
        >
          {row.sentiment}
        </div>

        <div class="vibe-archetype-name">{arc.name.toUpperCase()}</div>

        <div class="vibe-subtext">
          <span>{arc.vibe}</span>
          <Show when={reversal().reversed && reversal().previousScore != null}>
            <span class="vibe-subtext-reversal"> · ↓ from {reversal().previousScore}</span>
          </Show>
        </div>

        <footer class="vibe-credit" aria-hidden="true">
          <span>{row.model_version}</span>
          <span class="vibe-credit-dot">·</span>
          <span>{formatDate(row.generated_at)}</span>
        </footer>
      </article>
    );
  };

  return (
    <Show when={vibe()} fallback={<EmptyCard />}>
      {(_row) => (
        <Show when={archetype()} fallback={<EmptyCard />}>
          {(_arc) => (
            <Card
              id="vibes"
              as="article"
              class="vibe-card-shell"
              aria-label="Vibe"
              cornerLabel={archetype()?.numeral}
            >
              {cardBody()}
            </Card>
          )}
        </Show>
      )}
    </Show>
  );
}

export function VibeCardSkeleton() {
  return (
    <Shell as="article" class="vibe-card-shell" aria-label="Vibe">
      <div class="card-loading">
        <Skeleton shape="block" height={300} />
      </div>
    </Shell>
  );
}
