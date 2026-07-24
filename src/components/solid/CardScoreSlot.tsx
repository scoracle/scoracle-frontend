/**
 * CardScoreSlot — the uniform score slot every character card wears: the
 * character-assigned display score (0-99) over the drawn tarot card's name.
 *
 * Rendered by <Card> as the band's FIRST child (above the describer), so all
 * six cards carry the number in the same place and the ShadowCard clone
 * inherits it for free. The card bodies never render this themselves — they
 * only supply the score accessor to <Card>.
 *
 * Null score with the slot mounted = the unserved gap (product resolved, its
 * score field not served yet): the unclear dash over the Veil's name. Cards
 * with no product at all render <EmptyCard> instead and never mount this.
 */
import { Show } from "solid-js";
import { VEIL_CARD, type TarotCard } from "../../lib/cards/tarot-deck";
import "./content-cards.css";

interface CardScoreSlotProps {
  /** Display score 0-99, already clamped by <Card>; null = unserved. */
  score: number | null;
  /** The drawn card for the score; null = unserved. */
  drawn: TarotCard | null;
  /** Tier color for the numeral (per-character scale via cardScoreColor). */
  color?: string;
}

export default function CardScoreSlot(props: CardScoreSlotProps) {
  return (
    <div
      class="card-score-slot"
      aria-label={
        props.drawn && props.score != null
          ? `Score ${props.score} — ${props.drawn.name}`
          : "Score not yet read"
      }
    >
      <Show
        when={props.score != null ? props.drawn : null}
        fallback={
          <>
            <span class="card-score-value card-score-unread">—</span>
            <span class="card-micro-eyebrow card-score-name">{VEIL_CARD.name}</span>
          </>
        }
      >
        {(card) => (
          <>
            <span class="card-score-value" style={{ color: props.color }}>
              {props.score}
            </span>
            <span class="card-micro-eyebrow card-score-name">{card().name}</span>
          </>
        )}
      </Show>
    </div>
  );
}
