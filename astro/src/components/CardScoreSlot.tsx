import { Show } from "solid-js";
import type { TarotCard } from "../../../src/lib/cards/tarot-deck";
import "../../../src/components/solid/content-cards.css";
interface CardScoreSlotProps {
    score: number | null;
    drawn: TarotCard | null;
    color?: string;
}
export default function CardScoreSlot(props: CardScoreSlotProps) {
    return (<div class="card-score-slot" aria-label={props.drawn && props.score != null
            ? `Score ${props.score} — ${props.drawn.name}`
            : "Score not yet read"}>
      <Show when={props.score != null} fallback={<span class="card-score-value card-score-unread">—</span>}>
        <span class="card-score-value" style={{ color: props.color }}>
          {props.score}
        </span>
      </Show>
    </div>);
}
