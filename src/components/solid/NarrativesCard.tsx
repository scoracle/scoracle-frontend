import { useProfileReads, useProfileRead } from "../../lib/data/profile-data";
/** The Journalist's latest narratives, with headline and prose. */
import { For, Show, createMemo } from "solid-js";
import { useProfile } from "../../contexts/profile";
import { type Narrative } from "../../lib/data/news.server";
import GemmaSummary from "./GemmaSummary";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./NarrativesCard.css";
// Portrait-card fit cap (the card token never scrolls or crops): the top
// narratives by impact fill the silhouette at ~3. The rest of the scope's
// stories exist on /leaderboard — the card is the distilled read, not the
// archive.
const MAX_NARRATIVES = 3;
export default function NarrativesCard() {
    const ctx = useProfile();
    const news = useProfileRead("news");
    // Memoized: this copied, sorted and sliced on every read, and it is read more
    // than once per render. Keeps item identities stable so the <For> diffs.
    const narratives = createMemo(() => [...(news()?.narratives ?? [])]
        .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
        .slice(0, MAX_NARRATIVES));
    // The Journalist's card score — his latest read of the wire. Centralized in
    // deck-scores.ts (createDeckScoreReader), read by the meta-card ring too.
    const cardScore = createDeckScoreReader(ctx, useProfileReads(), "narratives");
    const emptyMessage = () => news() ? "No stories forming yet." : "No news yet.";
    return (<Show when={news() && narratives().length > 0} fallback={<EmptyCard message={emptyMessage()}/>}>
      <Card id="narratives" as="article" aria-label="Narratives" class="news-card" score={cardScore}>
        <p class="card-identifier">Latest narratives, impact ranked</p>

        <Show when={news()?.headline}>
          <h2 class="card-hook">{news()!.headline}</h2>
        </Show>

        <div class="news-narratives">
          <For each={narratives()}>
            {(n: Narrative) => (<article class="narrative">
                <h3 class="narrative-title">{n.narrative_title}</h3>
                <GemmaSummary text={n.body} source={n.source_attribution} class="narrative-body"/>
              </article>)}
          </For>
        </div>
      </Card>
    </Show>);
}
