/**
 * NewsCard — the NEWS product, with TRANSFERS folded in as a selectable scope.
 *
 * Default scope: the entity's Gemma NARRATIVES (the trending storylines, hottest
 * first by impact) — each a headline + write-up (via <GemmaSummary>) + its impact.
 * Transfers scope: the vetted rumor-heat list (reusing <TransferRow>) — a team's
 * incoming/outgoing players, or a player's interested clubs. News is a post-transfers
 * pipeline layer, so the narratives already carry transfer context — which is exactly
 * why Transfers is a clean SCOPE of News rather than its own card (Sigil convergence).
 *
 * The scope selector is now in the ScopeRail as a dropdown (newsScope control),
 * defaulting to "news". The card shows an identifier at the top indicating the current
 * scope: "Trending Narratives, Heat Ranked" for News, "Trending Transfer Narratives, Heat
 * Ranked" for Transfers (with sport-specific "Transfers" vs "Trades" noun).
 */

import { For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile, type NewsScope } from "../../contexts/profile";
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

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id, newsScope } = ctx;

  // Both products are warmed by the registry preload, so flipping scope is instant.
  const news = createAsync(() => getNews(sport(), type(), id()));
  const transfers = createAsync(() => getTransfers(sport(), type(), id()));

  const narratives = () => news()?.narratives ?? [];
  const rumors = () => transfers()?.transfers ?? [];
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");

  // Scope identifier text at the top of the card
  const scopeIdentifier = () => {
    const scope = newsScope();
    const noun = transferNoun(sport());
    if (scope === "transfers") {
      return `Trending ${noun} Narratives, Heat Ranked`;
    }
    return "Trending Narratives, Heat Ranked";
  };

  return (
    <Show when={news() ?? transfers()} fallback={<EmptyCard message="No news yet." />}>
      <Card id="news" as="article" aria-label="News">
        {/* Scope identifier at the top of the card */}
        <p class="news-identifier">{scopeIdentifier()}</p>

        <Show
          when={newsScope() === "news"}
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
