/**
 * NewsCard — the NEWS product. Reads getNews and renders the entity's Gemma
 * NARRATIVES (the trending storylines, hottest first by impact). News is a
 * post-transfers pipeline layer, so the narratives already carry transfer
 * context — transfers are their own card/product now. This card is purely the
 * narrative reveal: each story is a headline + the write-up (via <GemmaSummary>)
 * + its impact.
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNews } from "../../lib/data/news.server";
import { tierColor } from "../../lib/utils/tier-color";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./NewsCard.css";

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const data = createAsync(() => getNews(sport(), type(), id()));

  const narratives = () => data()?.narratives ?? [];

  return (
    <Show when={data()} fallback={<EmptyCard message="No news yet." />}>
      <Card id="news" as="article" aria-label="News">
        <Show
          when={narratives().length > 0}
          fallback={<p class="news-empty">No stories forming this cycle.</p>}
        >
          <div class="news-narratives">
            <For each={narratives()}>
              {(n) => (
                <article class="narrative">
                  <header class="narrative-head">
                    <h3 class="narrative-title">{n.narrative_title}</h3>
                    <span class="narrative-impact" style={{ color: tierColor(n.impact) }}>
                      {n.impact}
                    </span>
                  </header>
                  <GemmaSummary text={n.body} source={n.source_attribution} class="narrative-body" />
                </article>
              )}
            </For>
          </div>
        </Show>
      </Card>
    </Show>
  );
}

export function NewsCardSkeleton() {
  return (
    <Shell as="article" aria-label="News">
      <div class="news-narratives">
        <For each={Array.from({ length: 4 })}>
          {() => (
            <div class="narrative">
              <Skeleton shape="line" width={220} height={14} />
              <Skeleton shape="line" width={320} height={12} />
              <Skeleton shape="line" width={280} height={12} />
            </div>
          )}
        </For>
      </div>
    </Shell>
  );
}
