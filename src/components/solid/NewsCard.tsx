/**
 * NewsCard — the News hub. Narratives are the default read; Transfers/Trades
 * are the transfer-restricted facet of the same scoped news system; Vibe is
 * the past week's felt-reads (the momentum payload's 7-day snapshot window —
 * the leaderboard Vibe board's profile surface).
 */

import { For, Match, Show, Switch, createSignal, onMount } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { getNews, type Narrative, type NewsTrajectory } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { getMomentum, type MomentumVibeSnapshot } from "../../lib/data/momentum.server";
import { tierColor } from "../../lib/utils/tier-color";
import { formatDate, formatRelativeTime } from "../../lib/utils/date";
import { transferNoun } from "../../lib/cards/card-meta";
import { TransferRow } from "./TransferRow";
import GemmaSummary from "./GemmaSummary";
import Card from "./Card";
import EmptyCard from "./EmptyCard";
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
// narratives by impact fill the silhouette at ~3; compact transfer rows at ~5;
// vibe felt-reads are narrative-shaped so they share the ~3 cap. The rest of
// the scope's stories exist on /leaderboard — the card is the distilled read,
// not the archive.
const MAX_NARRATIVES = 3;
const MAX_RUMORS = 5;
const MAX_VIBE_READS = 3;

// vibe_scores.trigger_type (backend migration 035) → client-facing read label.
const VIBE_TRIGGER_LABELS: Record<string, string> = {
  milestone: "Milestone",
  periodic: "Scheduled read",
  news_spike: "News spike",
  manual: "Manual read",
};

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id, newsFacet, newsScope } = ctx;

  const news = createAsync(() => getNews(sport(), type(), id(), newsScope()));
  const transfers = createAsync(() => getTransfers(sport(), type(), id(), newsScope()));
  // Vibe reads ride the momentum payload (fixed 7-day snapshot window) — the
  // same query the meta card's Vibe chip resolves, so it lands cache-warm.
  const momentum = createAsync(() => getMomentum(sport(), type(), id(), ctx.season()));

  const narratives = () =>
    [...(news()?.narratives ?? [])]
      .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
      .slice(0, MAX_NARRATIVES);
  const rumors = () =>
    [...(transfers()?.transfers ?? [])]
      .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
      .slice(0, MAX_RUMORS);
  const vibeReads = () =>
    [...(momentum()?.vibes.snapshots ?? [])]
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      .slice(0, MAX_VIBE_READS);
  const counterpartyType = (): "player" | "team" => (type() === "team" ? "player" : "team");

  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const scopeIdentifier = () => {
    if (newsFacet() === "vibe") return "Past week vibe reads, latest first";
    const scopeLabel = activeScope()?.label ?? "Current week";
    if (newsFacet() === "transfers") {
      return `${scopeLabel} ${transferNoun(sport())}, heat ranked`;
    }
    return `${scopeLabel} narratives, impact ranked`;
  };

  const anyNewsProduct = () => news() ?? transfers() ?? momentum();
  const activeScope = () => (newsFacet() === "transfers" ? transfers()?.scope : news()?.scope) ?? null;

  // An empty scope is a whole-card empty: the active facet with zero items
  // ALWAYS shows the tarot no-content card (the Veil), never a lone line of
  // copy inside an otherwise blank card (Scott, 2026-07-11).
  const activeEmpty = () => {
    if (newsFacet() === "transfers") return rumors().length === 0;
    if (newsFacet() === "vibe") return vibeReads().length === 0;
    return narratives().length === 0;
  };
  const emptyMessage = () => {
    if (!anyNewsProduct()) return "No news yet.";
    if (newsFacet() === "transfers") return "No rumors in this scope.";
    if (newsFacet() === "vibe") return "No vibe reads this week.";
    return "No stories forming in this scope.";
  };

  return (
    <Show
      when={anyNewsProduct() && !activeEmpty()}
      fallback={<EmptyCard message={emptyMessage()} />}
    >
      <Card
        id="news"
        as="article"
        aria-label="News"
        class="news-card"
      >
        <p class="card-identifier">{scopeIdentifier()}</p>

        <Switch>
          <Match when={newsFacet() === "transfers"}>
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
          </Match>
          <Match when={newsFacet() === "vibe"}>
            {/* Vibe felt-reads borrow the narrative chrome — trigger as the
                title, tier-colored sentiment where impact sits, the blurb as
                the body, read time below. */}
            <div class="news-narratives">
              <For each={vibeReads()}>
                {(v: MomentumVibeSnapshot) => (
                  <article class="narrative">
                    <header class="narrative-head">
                      <h3 class="narrative-title">
                        {VIBE_TRIGGER_LABELS[v.trigger_type] ?? v.trigger_type}
                      </h3>
                      <span
                        class="narrative-impact"
                        style={{ color: tierColor(v.sentiment) }}
                      >
                        {Math.round(v.sentiment)}
                      </span>
                    </header>
                    <div class="news-meta">
                      <span>
                        Read{" "}
                        {mounted()
                          ? formatRelativeTime(v.generated_at)
                          : formatDate(v.generated_at)}
                      </span>
                    </div>
                    <Show when={v.blurb}>
                      {(blurb) => <GemmaSummary text={blurb()} class="narrative-body" />}
                    </Show>
                  </article>
                )}
              </For>
            </div>
          </Match>
          <Match when={true}>
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
          </Match>
        </Switch>
      </Card>
    </Show>
  );
}
