/**
 * NewsCard — the News hub. Narratives are the default read; Transfers/Trades are
 * the transfer-restricted facet of the same scoped news system.
 */

import { For, Show, createSignal, onMount } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNews, type Narrative, type NewsTimeScope, type NewsTrajectory } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { tierColor } from "../../lib/utils/tier-color";
import { formatDate, formatRelativeTime } from "../../lib/utils/date";
import { transferNoun } from "../../lib/cards/card-meta";
import { TransferRow } from "./TransferRow";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import LoadingCard from "./LoadingCard";
import "./content-cards.css";
import "./NewsCard.css";
import "./RatingList.css";
import "./TransfersCard.css";

type NewsFreshnessItem = {
  updated_at?: string | null;
  generated_at?: string | null;
  source_count?: number | null;
  source_names?: string[] | null;
  source_latest_at?: string | null;
  trajectory?: NewsTrajectory | null;
  trajectory_label?: string | null;
};

const TRAJECTORY_LABELS: Record<NewsTrajectory, string> = {
  developing_story: "Developing story",
  heating_up: "Heating up",
  cooling_off: "Cooling off",
};

const NEWS_SCOPE_CORNER: Record<string, string> = {
  current_week: "WEEK",
  last_week: "LAST",
  two_weeks_ago: "2 WK",
  three_weeks_ago: "3 WK",
  last_month: "MONTH",
};

function weekCornerLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7));
  return `WK ${week}`;
}

function scopeCornerLabel(scope: NewsTimeScope | null | undefined, fallbackKey: string): string {
  if (scope?.key === "last_month") return "MONTH";
  return weekCornerLabel(scope?.starts_at) ?? NEWS_SCOPE_CORNER[scope?.key ?? fallbackKey] ?? "NEWS";
}

function trajectoryLabel(item: NewsFreshnessItem): string | null {
  if (item.trajectory_label) return item.trajectory_label;
  return item.trajectory ? TRAJECTORY_LABELS[item.trajectory] : null;
}

function freshnessTime(item: NewsFreshnessItem, mounted: boolean): string | null {
  const at = item.source_latest_at ?? item.updated_at ?? item.generated_at ?? null;
  if (!at) return null;
  return mounted ? formatRelativeTime(at) : formatDate(at);
}

function sourceLabel(item: NewsFreshnessItem): string | null {
  const count = item.source_count ?? 0;
  const names = item.source_names ?? [];
  if (count <= 0 && names.length === 0) return null;
  const countLabel = count > 0 ? `${count} ${count === 1 ? "source" : "sources"}` : null;
  const shownNames = names.slice(0, 2).join(", ");
  return [countLabel, shownNames].filter(Boolean).join(" · ");
}

function FreshnessMeta(props: { item: NewsFreshnessItem; mounted: boolean }) {
  const label = () => trajectoryLabel(props.item);
  const time = () => freshnessTime(props.item, props.mounted);
  const sources = () => sourceLabel(props.item);

  return (
    <Show when={label() || time() || sources()}>
      <div class="news-meta">
        <Show when={label()}>
          {(l) => (
            <span class="news-trajectory" data-trajectory={props.item.trajectory ?? undefined}>
              {l()}
            </span>
          )}
        </Show>
        <Show when={time()}>
          {(t) => <span>Updated {t()}</span>}
        </Show>
        <Show when={sources()}>
          {(s) => <span>{s()}</span>}
        </Show>
      </div>
    </Show>
  );
}

// Portrait-card fit caps (the card token never scrolls or crops): the top
// narratives by impact fill the silhouette at ~3; compact transfer rows at ~5.
// The rest of the scope's stories exist on /leaderboard — the card is the
// distilled read, not the archive.
const MAX_NARRATIVES = 3;
const MAX_RUMORS = 5;

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id, newsFacet, newsScope } = ctx;

  const news = createAsync(() => getNews(sport(), type(), id(), newsScope()));
  const transfers = createAsync(() => getTransfers(sport(), type(), id(), newsScope()));

  const narratives = () =>
    [...(news()?.narratives ?? [])]
      .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
      .slice(0, MAX_NARRATIVES);
  const rumors = () =>
    [...(transfers()?.transfers ?? [])]
      .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
      .slice(0, MAX_RUMORS);
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");

  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const scopeIdentifier = () => {
    const scopeLabel = activeScope()?.label ?? "Current week";
    if (newsFacet() === "transfers") {
      return `${scopeLabel} ${transferNoun(sport())}, heat ranked`;
    }
    return `${scopeLabel} narratives, impact ranked`;
  };

  const anyNewsProduct = () => news() ?? transfers();
  const activeScope = () => (newsFacet() === "transfers" ? transfers()?.scope : news()?.scope) ?? null;

  return (
    <Show when={anyNewsProduct()} fallback={<EmptyCard message="No news yet." />}>
      <Card
        id="news"
        as="article"
        aria-label="News"
        class="news-card"
        cornerLabel={scopeCornerLabel(activeScope(), newsScope())}
      >
        <p class="card-identifier news-identifier">{scopeIdentifier()}</p>

        <Show
          when={newsFacet() === "transfers"}
          fallback={
            <Show
              when={narratives().length > 0}
              fallback={<p class="news-empty">No stories forming in this scope.</p>}
            >
              <div class="news-narratives">
                <For each={narratives()}>
                  {(n: Narrative) => (
                    <article class="narrative">
                      <header class="narrative-head">
                        <h3 class="narrative-title">{n.narrative_title}</h3>
                        <span class="narrative-impact" style={{ color: tierColor(n.impact) }}>
                          {n.impact}
                        </span>
                      </header>
                      <FreshnessMeta item={n} mounted={mounted()} />
                      <GemmaSummary text={n.body} source={n.source_attribution} class="narrative-body" />
                    </article>
                  )}
                </For>
              </div>
            </Show>
          }
        >
          <Show when={rumors().length > 0} fallback={<p class="news-empty">No rumors in this scope.</p>}>
            <div class="rating-list">
              <ol class="rating-list-rows">
                <For each={rumors()}>
                  {(t) => (
                    <TransferRow
                      t={t}
                      sport={sport()}
                      counterpartyType={counterpartyType()}
                      mounted={mounted()}
                    />
                  )}
                </For>
              </ol>
            </div>
          </Show>
        </Show>
      </Card>
    </Show>
  );
}

export function NewsCardSkeleton() {
  return <LoadingCard label="News" />;
}
