import { For, Show } from "solid-js";
import { useProfileReads, useProfileRead } from "../../lib/data/profile-data";
import { useProfile } from "../../contexts/profile";
import { formatDate } from "../../lib/utils/date";
import GemmaSummary from "./GemmaSummary";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./VibeCard.css";

/** Show the API's current product, with its own optional score, date and sources. */
export default function VibeCard() {
    const ctx = useProfile();
    const vibe = useProfileRead("vibe");
    const current = () => vibe()?.current;
    const heat = createDeckScoreReader(ctx, useProfileReads(), "vibe");
    return (<Show when={current()} fallback={<EmptyCard message="No supported reading yet."/>}>
      {(r) => (<Card id="vibe" as="article" aria-label="Vibe" class="vibe-feed-card" score={heat() == null ? undefined : heat}>
          <p class="card-identifier">The room's felt read</p>
          <h2 class="card-hook">{r().headline}</h2>
          <GemmaSummary text={r().body} class="vibe-felt-read"/>
          <footer class="vibe-reading-details">
            <time datetime={r().generated_at} title={r().generated_at}>Read {formatDate(r().generated_at)}, {new Date(r().generated_at).getUTCFullYear()}</time>
            <Show when={r().sources?.length}>
              <nav aria-label="Reading sources">
                <For each={r().sources}>{(source) => (
                  <a href={/^https?:\/\//i.test(source.url) ? source.url : undefined} target="_blank" rel="noopener noreferrer">{source.publisher || "Source"}</a>
                )}</For>
              </nav>
            </Show>
          </footer>
        </Card>)}
    </Show>);
}
