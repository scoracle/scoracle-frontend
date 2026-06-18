/**
 * EmptyCard — shared "no data" card, rendered as the **Veil** vibe-card
 * variant: the same vessel-and-archetype shape every resolved Card uses,
 * just without a numeric score. Lifts the visual language of the vibe
 * deck onto every empty surface (Vibes, Articles, X, Trends, …) so the
 * null state reads as part of the deck rather than a separate "error"
 * affordance.
 *
 * The Veil archetype lives in `lib/vibe/archetypes.ts` alongside the
 * eleven score-banded archetypes; consumers don't need to know that
 * detail — they just render `<EmptyCard />` and get the right look.
 *
 * Used in two patterns:
 *
 *   1. As an *alternative* to a Card's own Shell — e.g., SigilCard's
 *      empty state replaces the SigilCard's Shell with this one. The
 *      EmptyCard's Shell carries the chrome.
 *   2. As an *inside* fallback within another Card's Shell — e.g.,
 *      NewsCard's Show-fallback when the merged feed is empty. Pattern 2
 *      yields a nested chrome and should be avoided when possible.
 */

import { Show } from "solid-js";
import { VEIL_ARCHETYPE } from "../../lib/vibe/archetypes";
import Shell from "./Shell";
import "./EmptyCard.css";

interface EmptyCardProps {
  /** Subtext under the Veil illustration. Defaults to the archetype's
   *  `vibe` ("drawn but unread"); pass a context-specific override when
   *  the generic phrasing isn't what you want. */
  message?: string;
  /** Small parenthetical note below the subtext, same size and font.
   *  Defaults to "(no mentions found)"; pass an empty string to suppress
   *  or a different parenthetical for context-specific surfaces. */
  note?: string;
}

export default function EmptyCard(props: EmptyCardProps) {
  return (
    <Shell
      as="article"
      class="empty-card-shell"
      aria-label="No data"
      cornerLabel={VEIL_ARCHETYPE.numeral}
    >
      <div class="empty-card">
        <div class="empty-card-art">
          <img src={`/vibe-art/${VEIL_ARCHETYPE.slug}.svg`} alt="" />
        </div>
        <div class="empty-card-name">{VEIL_ARCHETYPE.name.toUpperCase()}</div>
        <div class="empty-card-text">
          {props.message ?? VEIL_ARCHETYPE.vibe}
        </div>
        <Show when={(props.note ?? "(no mentions found)") !== ""}>
          <div class="empty-card-note">
            {props.note ?? "(no mentions found)"}
          </div>
        </Show>
      </div>
    </Shell>
  );
}
