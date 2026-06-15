/**
 * NewsCard — the NEWS RAIL (two-rail model). Reads getNewsRail once and renders
 * the entity's Gemma NARRATIVES (the trending storylines, hottest first), with an
 * All / Transfers content-type scope: "All" shows the narratives; "Transfers"
 * drills to the structured rumor heat (the evidence behind the take). Each
 * narrative is a headline + the write-up (via <GemmaSummary>) + its impact;
 * transfers reuse the TransfersCard row. The vibe rides in the same rail (for the
 * Vibe card) — this card is the narrative reveal.
 */

import { createSignal, For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNewsRail } from "../../lib/data/news-rail.server";
import { tierColor } from "../../lib/utils/tier-color";
import { transferNoun } from "../../lib/cards/card-meta";
import GemmaSummary from "./GemmaSummary";
import { TransferRow } from "./TransfersCard";
import Card from "./Card";
import Shell from "./Shell";
import EmptyCard from "./EmptyCard";
import Skeleton from "./Skeleton";
import NavStrip from "./NavStrip";
import ScopeStrip from "./ScopeStrip";
import "./content-cards.css";
import "./RatingList.css";
import "./TransfersCard.css";
import "./NewsCard.css";

type NewsScope = "all" | "transfers";

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;
  const rail = createAsync(() => getNewsRail(sport(), type(), id()));

  const [scope, setScope] = createSignal<NewsScope>("all");
  const narratives = () => rail()?.narratives ?? [];
  const transfers = () => rail()?.transfers ?? [];
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");
  const noun = () => transferNoun(sport());

  const scopeItems = (): ReadonlyArray<{ id: NewsScope; label: string }> => [
    { id: "all", label: "All" },
    { id: "transfers", label: noun() },
  ];

  return (
    <Show when={rail()} fallback={<EmptyCard message="No news yet." />}>
      <Card id="news" as="article" aria-label="News">
        <Show when={transfers().length > 0}>
          <ScopeStrip ariaLabel="News scope">
            <NavStrip
              inline
              items={scopeItems()}
              active={scope()}
              onSelect={(s) => setScope(s)}
              ariaLabel="Content type"
            />
          </ScopeStrip>
        </Show>

        <Show
          when={scope() === "all"}
          fallback={
            <Show
              when={transfers().length > 0}
              fallback={<p class="news-empty">No rumors yet.</p>}
            >
              <div class="rating-list">
                <h3 class="rating-list-title">{noun()} · Heat</h3>
                <ol class="rating-list-rows">
                  <For each={transfers()}>
                    {(t) => <TransferRow t={t} sport={sport()} counterpartyType={counterpartyType()} />}
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
