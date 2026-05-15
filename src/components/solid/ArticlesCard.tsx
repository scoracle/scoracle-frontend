/**
 * ArticlesCard — News article list rendered inside the News-mode tab.
 *
 * The user-visible tab label stays "News" — this is the card behind it.
 * Reads via SolidStart's `createAsync` against the server-side `getNews`
 * query (src/lib/data/news.server.ts). Shares the cache with CoMentionsCard.
 *
 * Uniform card shape: data + render. Loading state (the skeleton
 * fallback) is wired by ContentShell's per-pane <Suspense>. The
 * skeleton is exported here so the parent composition can wire it
 * in. Empty state reuses the shared EmptyCard (deck-back tarot
 * illustration) so Articles / X / Vibes all read with one visual
 * voice.
 */

import { Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { sanitizeUrl } from "../../lib/utils/url";
import { formatDate } from "../../lib/utils/date";
import { getNews } from "../../lib/data/news.server";
import { useProfile } from "../../contexts/profile";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./ArticlesCard.css";

export default function ArticlesCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const articles = createAsync(() => getNews(sport, type, id));

  return (
    <Show
      when={articles() && articles()!.length > 0}
      fallback={<EmptyCard />}
    >
      <Shell as="article" unlockHeight class="articles-card-shell" aria-label="Articles">
        <div class="news-list">
          <For each={articles()}>
            {(article) => (
              <div class="news-item">
                <h3 class="news-title">
                  <a
                    href={sanitizeUrl(article.url) || article.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.title || "Untitled"}
                  </a>
                </h3>
                <div class="news-meta">
                  {article.source || ""}
                  {article.source && article.published_at ? " · " : ""}
                  {formatDate(article.published_at ?? undefined)}
                </div>
              </div>
            )}
          </For>
        </div>
      </Shell>
    </Show>
  );
}

export function ArticlesCardSkeleton() {
  // Skeleton sized to a typical resolved Articles feed (~8 items at
  // ~88 px each = ~700 px). Predictive sizing keeps first-activation
  // CLS small without a fixed page-level min-height reservation.
  return (
    <Shell as="article" unlockHeight class="articles-card-shell" aria-label="Articles">
      <div class="card-loading">
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={88} />
      </div>
    </Shell>
  );
}
