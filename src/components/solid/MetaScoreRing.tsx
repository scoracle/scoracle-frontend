import { For, Show } from "solid-js";
import { META_SCORE_DECKS, type MetaScoreDeck, type MetaScores } from "../../lib/cards/meta-score-layout";
import { displayScore } from "../../lib/cards/tarot-deck";
import { transferNoun } from "../../lib/cards/card-meta";
import { cardScoreColor } from "../../lib/utils/tier-color";
import type { EntityType } from "../../lib/types";

/** Each available score is an independent child. CSS distributes only the
 * rendered slots around the crest, so no aggregate async read is required. */
export function MetaScoreSlot(props: {
    deck: MetaScoreDeck;
    value: number | null | undefined;
    sport: string;
    type: EntityType;
}) {
    const value = () => props.value != null && Number.isFinite(props.value) ? displayScore(props.value) : null;
    return <Show when={value() != null}>
        <div class="pw-ring-slot" data-deck={props.deck}>
            <span class="pw-ring-value" style={{ color: cardScoreColor(props.deck, value()!, props.type) }}>{String(value())}</span>
            <span class="pw-ring-label">
                {props.deck === "transfers" ? transferNoun(props.sport) : props.deck.charAt(0).toUpperCase() + props.deck.slice(1)}
            </span>
        </div>
    </Show>;
}

export default function MetaScoreRing(props: { scores: MetaScores; sport: string; type: EntityType }) {
    return <For each={META_SCORE_DECKS}>{deck =>
        <MetaScoreSlot deck={deck} value={props.scores[deck]} sport={props.sport} type={props.type} />
    }</For>;
}
