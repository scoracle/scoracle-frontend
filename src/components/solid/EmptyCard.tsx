/**
 * EmptyCard — shared "no data" card, rendered as the **Veil** vibe-card
 * variant: the same vessel-and-archetype shape every resolved Card uses,
 * just without a numeric score. Lifts the visual language of the vibe
 * deck onto every empty profile surface so the
 * null state reads as part of the deck rather than a separate "error"
 * affordance.
 *
 * The Veil archetype lives in `lib/vibe/archetypes.ts` alongside the
 * eleven score-banded archetypes; consumers don't need to know that
 * detail — they just render `<EmptyCard />` and get the right body. The
 * card corners still use the profile target entity ID.
 *
 * Used as a whole-card replacement: the EmptyCard's Shell carries the chrome.
 * In-card partial empties should render local copy inside the already-resolved
 * card body instead of nesting another Shell.
 */

import { Show } from "solid-js";
import { VEIL_ARCHETYPE } from "../../lib/vibe/archetypes";
import { useProfile } from "../../contexts/profile";
import { targetEntityCornerLabel } from "../../lib/utils/card-corner";
import Shell from "./Shell";
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
  const ctx = useProfile();

  return (
    <Shell
      as="article"
      class="empty-card-shell"
      aria-label="No data"
      cornerLabel={targetEntityCornerLabel(ctx.id())}
    >
      <div class="empty-card">
        <div class="empty-card-art">
          <img src={`/vibe-art/${VEIL_ARCHETYPE.slug}.svg`} alt="" />
        </div>
        <div class="empty-card-name">{VEIL_ARCHETYPE.name.toUpperCase()}</div>
        <div class="empty-card-text">
          {props.message ?? VEIL_ARCHETYPE.vibe}
        </div>
        <Show when={(props.note ?? "") !== ""}>
          <div class="empty-card-note">
            {props.note}
          </div>
        </Show>
      </div>
    </Shell>
  );
}
