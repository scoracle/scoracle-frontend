import { createMemo, For } from "solid-js";
import { metaScoreLayout, type MetaScores } from "../../lib/cards/meta-score-layout";
import { transferNoun } from "../../lib/cards/card-meta";
import { cardScoreColor } from "../../lib/utils/tier-color";
import type { EntityType } from "../../lib/types";

/** Pure ring geometry: the illustration never decides which readings exist.
 * Every finite score owns one position. No decorative connector geometry. */
export default function MetaScoreRing(props: {
  scores: MetaScores;
  sport: string;
  type: EntityType;
}) {
  const slots = createMemo(() => metaScoreLayout(props.scores));
  return <>
    <For each={slots()}>{slot => (
      <div class="pw-ring-slot" data-deck={slot.deck} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
        <span class="pw-ring-value" style={{ color: cardScoreColor(slot.deck, slot.value, props.type) }}>
          {slot.value}
        </span>
        <span class="pw-ring-label">
          {slot.deck === "transfers" ? transferNoun(props.sport) : slot.deck.charAt(0).toUpperCase() + slot.deck.slice(1)}
        </span>
      </div>
    )}</For>
  </>;
}
