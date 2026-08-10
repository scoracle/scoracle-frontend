/**
 * EmptyCard — shared "no data" card, rendered as the **Veil** vibe-card
 * variant: the same vessel-and-archetype shape every resolved Card uses,
 * just without a numeric score. Lifts the visual language of the vibe
 * deck onto every empty profile surface so the
 * null state reads as part of the deck rather than a separate "error"
 * affordance.
 *
 * The Veil card lives in `lib/cards/tarot-deck.ts` alongside the six
 * character decks; consumers don't need to know that detail — they just
 * render `<EmptyCard />` and get the right body. The foot box names the Veil; corner
 * numerals are retired product-wide (2026-08-04).
 *
 * Used as a whole-card replacement: the EmptyCard's vessel carries the chrome.
 * In-card partial empties should render local copy inside the already-resolved
 * card body instead of nesting another card.
 */

import { Show } from "solid-js";
import { VEIL_CARD } from "../../lib/cards/tarot-deck";
import { CardVessel } from "./Card";
import "./EmptyCard.css";

interface EmptyCardProps {
  /** Subtext under the Veil illustration. Defaults to the archetype's
   *  `vibe` ("drawn but unread"); pass a context-specific override when
   *  the generic phrasing isn't what you want. */
  message?: string;
  /** Small parenthetical note below the subtext, same size and font.
   *  Defaults to empty; News-family callers can opt into mention-specific
   *  vocabulary when that is the right context. */
  note?: string;
}

export default function EmptyCard(props: EmptyCardProps) {
  return (
    <CardVessel as="article" title={VEIL_CARD.name} aria-label="No data">
      <div class="empty-card">
        <div class="empty-card-art">
          <img src={`/vibe-art/${VEIL_CARD.slug}.svg`} alt="" />
        </div>
        <div class="empty-card-text">
          {props.message ?? VEIL_CARD.vibe}
        </div>
        <Show when={(props.note ?? "") !== ""}>
          <div class="empty-card-note">
            {props.note}
          </div>
        </Show>
      </div>
    </CardVessel>
  );
}
