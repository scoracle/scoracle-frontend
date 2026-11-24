import { Show } from "solid-js";
import type { VibeCurrent } from "../lib/data/vibe";
import type { EntityType } from "../lib/types";
import { formatDate } from "../lib/utils/date";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import "./content-cards.css";
import "./VibeCard.css";

/** Show the API's current product, with its own optional score, date. */
export default function VibeCard(props: { current: VibeCurrent; score: number | null; type: EntityType }) {
    return (<Show when={props.current}>
      {(r) => (<Card id="vibe" as="article" aria-label="Vibe" class="vibe-feed-card" type={props.type} score={props.score == null ? undefined : () => props.score}>
          <p class="card-identifier">The room's felt read</p>
          <h2 class="card-hook">{r().headline}</h2>
          <GemmaSummary text={r().body} class="vibe-felt-read"/>
          <footer class="vibe-reading-details">
            <time datetime={r().generated_at} title={r().generated_at}>Read {formatDate(r().generated_at)}, {new Date(r().generated_at).getUTCFullYear()}</time>
          </footer>
        </Card>)}
    </Show>);
}
