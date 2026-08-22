/**
 * NarrativesCard — The Journalist's card (Characters Phase 1, 2026-07-22):
 * the storylines. The old News hub minus its facets — Transfers and Vibe are
 * peer cards now (TransfersCard, VibeCard). Keeps the shared historical
 * `newsScope`. Uniform card contract (2026-08-21): headline + prose, nothing
 * else — the freshness/trajectory/source chips retired as noise.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNews, type Narrative } from "../../lib/data/news.server";
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
  const { sport, type, id, newsScope } = ctx;

  const news = createAsync(() => getNews(sport(), type(), id(), newsScope()));

  const narratives = () =>
    [...(news()?.narratives ?? [])]
      .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
      .slice(0, MAX_NARRATIVES);

  // The Journalist's card score — his latest read of the wire. Centralized in
  // deck-scores.ts (createDeckScoreReader), read by the meta-card ring too.
  const cardScore = createDeckScoreReader(ctx, "narratives");

  const scopeIdentifier = () =>
    `${news()?.scope?.label ?? "Current week"} narratives, impact ranked`;

  // An empty scope is a whole-card empty: zero storylines ALWAYS shows the
  // tarot no-content card (the Veil), never a lone line of copy inside an
  // otherwise blank card (Scott, 2026-07-11).
  const emptyMessage = () =>
    news() ? "No stories forming in this scope." : "No news yet.";

  return (
    <Show
      when={news() && narratives().length > 0}
      fallback={<EmptyCard message={emptyMessage()} />}
    >
      <Card
        id="narratives"
        as="article"
        aria-label="Narratives"
        class="news-card"
        score={cardScore}
      >
        <p class="card-identifier">{scopeIdentifier()}</p>

        <div class="news-narratives">
          <For each={narratives()}>
            {(n: Narrative) => (
              <article class="narrative">
                <h3 class="narrative-title">{n.narrative_title}</h3>
                <GemmaSummary text={n.body} source={n.source_attribution} class="narrative-body" />
              </article>
            )}
          </For>
        </div>
      </Card>
    </Show>
  );
}
