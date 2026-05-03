/**
 * NewsTab — News article list (Solid.js)
 *
 * Reads via SolidStart's `createAsync` against the server-side `getNews`
 * query (src/lib/data/news.server.ts). Shares the cache with CoMentionsTab.
 *
 * Uniform tab shape: this component is just data + render. Loading state
 * (the skeleton fallback) is handled by TabContainer's <Suspense> using
 * the `fallback` from the parent card's TabDef. The skeleton is exported
 * here so the card composition can wire it in.
 */

import { Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { sanitizeUrl } from "../../lib/utils/url";
import { formatDate } from "../../lib/utils/date";
import { getNews } from "../../lib/data/news.server";
import { useProfile } from "../../contexts/profile";
import Skeleton from "./Skeleton";
import "./content-tabs.css";
import "./NewsTab.css";

export default function NewsTab() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const articles = createAsync(() => getNews(sport, type, id));

  return (
    <Show
      when={articles() && articles()!.length > 0}
      fallback={<div class="tab-empty-state">No news articles found</div>}
    >
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
    </Show>
  );
}

export function NewsTabSkeleton() {
  return (
    <div class="tab-loading-skeleton">
      <Skeleton shape="block" height={80} />
      <Skeleton shape="block" height={80} />
      <Skeleton shape="block" height={80} />
    </div>
  );
}
