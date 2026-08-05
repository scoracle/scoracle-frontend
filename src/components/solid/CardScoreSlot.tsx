/**
 * CardScoreSlot — the head: the score alone, centred under the top rule,
 * in the tier hue, at a fixed height on every card — the number lands in
 * the same place whichever card you turn to (Swords set, 2026-08-04).
 *
 * Rendered by <Card> as the band's FIRST child (above the describer), so all
 * six cards carry the number in the same place and the ShadowCard clone
 * inherits it for free. The drawn card's NAME lives in the vessel's foot
 * box (CardVessel), not here.
 *
 * Null score with the slot mounted = the unserved gap (product resolved, its
 * score field not served yet): the unread dash. Cards with no product at all
 * render <EmptyCard> instead and never mount this.
 */
import { Show } from "solid-js";
import type { TarotCard } from "../../lib/cards/tarot-deck";
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
        when={props.score != null}
        fallback={<span class="card-score-value card-score-unread">—</span>}
      >
        <span class="card-score-value" style={{ color: props.color }}>
          {props.score}
        </span>
      </Show>
    </div>
  );
}
