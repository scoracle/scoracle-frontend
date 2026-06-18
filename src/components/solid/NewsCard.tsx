/**
 * NewsCard — the NEWS product, with TRANSFERS folded in as a selectable scope.
 *
 * Default scope: the entity's Gemma NARRATIVES (the trending storylines, hottest
 * first by impact) — each a headline + write-up (via <GemmaSummary>) + its impact.
 * Transfers scope: the vetted rumor-heat list (reusing <TransferRow>) — a team's
 * incoming/outgoing players, or a player's interested clubs. News is a post-transfers
 * pipeline layer, so the narratives already carry transfer context — which is exactly
 * why Transfers is a clean SCOPE of News rather than its own card (Sigil convergence).
 */

import { For, Show, createSignal } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNews } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { tierColor } from "../../lib/utils/tier-color";
import { transferNoun } from "../../lib/cards/card-meta";
import { TransferRow } from "./TransfersCard";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./NewsCard.css";
import "./RatingList.css";
import "./TransfersCard.css";

type NewsScope = "news" | "transfers";

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const [scope, setScope] = createSignal<NewsScope>("news");

  // Both products are warmed by the registry preload, so flipping scope is instant.
  const news = createAsync(() => getNews(sport(), type(), id()));
  const transfers = createAsync(() => getTransfers(sport(), type(), id()));

  const narratives = () => news()?.narratives ?? [];
  const rumors = () => transfers()?.transfers ?? [];
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");
  const transfersWord = () => transferNoun(sport());

  return (
    <Show when={news() ?? transfers()} fallback={<EmptyCard message="No news yet." />}>
      <Card id="news" as="article" aria-label="News">
        {/* Scope toggle — News narratives or the Transfers/Trades heat list. */}
        <div class="news-scope" role="tablist" aria-label="News scope">
          <button
            type="button"
            role="tab"
            class="news-scope-btn"
            classList={{ "news-scope-active": scope() === "news" }}
            aria-selected={scope() === "news"}
            onClick={() => setScope("news")}
          >
            News
          </button>
          <button
            type="button"
            role="tab"
            class="news-scope-btn"
            classList={{ "news-scope-active": scope() === "transfers" }}
            aria-selected={scope() === "transfers"}
            onClick={() => setScope("transfers")}
          >
            {transfersWord()}
          </button>
        </div>

        <Show
          when={scope() === "news"}
          fallback={
            <Show
              when={rumors().length > 0}
              fallback={<p class="news-empty">No rumors this cycle.</p>}
            >
              <div class="rating-list">
                <ol class="rating-list-rows">
                  <For each={rumors()}>
                    {(t) => (
                      <TransferRow t={t} sport={sport()} counterpartyType={counterpartyType()} />
                    )}
                  </For>
                </ol>
              </div>
            </Show>
          }
        >
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
