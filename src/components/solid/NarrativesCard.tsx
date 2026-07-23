/**
 * NarrativesCard — The Journalist's card (Characters Phase 1, 2026-07-22):
 * the storylines, their freshness and trajectory. The old News hub minus its
 * facets — Transfers and Vibe are peer cards now (TransfersCard, VibeCard).
 * Keeps the shared historical `newsScope`.
 */

import { For, Show, createSignal, onMount } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNews, type Narrative, type NewsTrajectory } from "../../lib/data/news.server";
import { tierColor } from "../../lib/utils/tier-color";
import { formatDate, formatRelativeTime } from "../../lib/utils/date";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
import "./content-cards.css";
import "./NarrativesCard.css";

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

  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

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
      >
        <p class="card-identifier">{scopeIdentifier()}</p>

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
      </Card>
    </Show>
  );
}
