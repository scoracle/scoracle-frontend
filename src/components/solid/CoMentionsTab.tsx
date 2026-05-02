/**
 * CoMentionsTab — Co-mentioned entities list (Solid.js)
 *
 * Reads news + tweets via the SAME `query()`-cached server-fns that
 * NewsTab and XTab call. By the time a user clicks Co-mentions, both
 * caches are warm — there's no separate publish/subscribe layer here,
 * no race against tab activation, and no nanostore mirrors.
 *
 * The sport's entity directory is a bundled JSON file under /data/, so
 * it stays a client-side `createResource` (no API call → no benefit
 * from server-fn migration). The directory load + the news/tweet caches
 * combine in a `createMemo` that re-runs when any input changes — SWR
 * revalidations on news propagate to the co-mention list automatically.
 */

import { createMemo, Show, For } from "solid-js";
import { isServer } from "solid-js/web";
import { createAsync, query } from "@solidjs/router";

import {
  findCoMentions,
  entityMatchesText,
  loadEntitiesForSport,
  type Article,
  type CoMention,
  type Entity,
} from "../../lib/utils/co-mentions";
import { formatDate } from "../../lib/utils/date";
import { useProfile } from "../../contexts/profile";
import { getNews } from "../../lib/data/news.server";
import { getTwitterFeed, type Tweet } from "../../lib/data/twitter.server";
import Skeleton from "./Skeleton";
import "./content-tabs.css";
import "./CoMentionsTab.css";

// Sport entity directory — bundled JSON, client-only. Wrapped in
// query() for cache + dedup symmetry with every other data load on
// the site. SSR returns null; the client hydrates.
async function fetchEntities(sport: string): Promise<Entity[] | null> {
  if (isServer || !sport) return null;
  return loadEntitiesForSport(sport);
}
const getEntities = query(fetchEntities, "entities");

function tweetToArticle(tweet: Tweet): Article & { kind: "tweet"; author?: string } {
  return {
    kind: "tweet",
    title: tweet.text,
    url: `https://twitter.com/${tweet.author_username}/status/${tweet.id}`,
    published_at: tweet.created_at,
    source: `@${tweet.author_username}`,
    author: tweet.author,
  };
}

export default function CoMentionsTab() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // News + Twitter both flow from the same query() cache that NewsTab
  // and XTab populate. createAsync hits the cache instantly when warm
  // and triggers the server-fn (or the SSR streaming path) when cold.
  const news = createAsync(() => getNews(sport, type, id));
  const twitter = createAsync(() => getTwitterFeed(sport, type, id, 20));

  // Entity directory: same createAsync + query() shape as every other
  // data load on the site. The fetcher gates on !isServer so SSR
  // doesn't try to fetch the bundled JSON via a relative URL.
  const entities = createAsync(() => getEntities(sport));

  const result = createMemo(() => {
    if (!sport || !type || !id) return null;
    const e = entities();
    const n = news();
    if (!e || n === undefined) return null; // both inputs must be ready
    const t = twitter();
    const tweetArticles = (t?.available && t.tweets.length ? t.tweets : []).map(tweetToArticle);
    const articles: Article[] = [...n, ...tweetArticles];
    if (articles.length === 0) return null;
    const coMentions = findCoMentions(articles, e, id, type);
    return coMentions.length > 0 ? { coMentions, articles } : null;
  });

  // Skeleton until BOTH the entity directory AND news have arrived.
  // Tweets are best-effort; if they're still loading, news-only result
  // is good enough and the memo will re-derive when tweets land.
  // createAsync: undefined while loading; non-undefined once resolved.
  const stillLoading = () => entities() === undefined || news() === undefined;

  function sharedArticles(cm: CoMention, articles: Article[]) {
    return articles.filter((a) => a.title && entityMatchesText(cm.entity.name, a.title));
  }

  return (
    <div>
      <Show
        when={!stillLoading()}
        fallback={
          <div class="tab-loading-skeleton">
            <Skeleton shape="block" height={56} />
            <Skeleton shape="block" height={56} />
            <Skeleton shape="block" height={56} />
          </div>
        }
      >
        <Show
          when={result()}
          fallback={<div class="tab-empty-state">No co-mentions found in recent articles</div>}
        >
          {(r) => (
            <ul class="co-mentions-list">
              <For each={r().coMentions}>
                {(cm) => {
                  const team = () => (cm.entity.team ? ` - ${cm.entity.team}` : "");
                  const countLabel = () => (cm.mentionCount === 1 ? "mention" : "mentions");
                  const shared = () => sharedArticles(cm, r().articles);

                  return (
                    <li class="co-mention-item">
                      <details class="co-mention-details">
                        <summary class="co-mention-summary">
                          <span class="co-mention-info">
                            <span class="co-mention-name">
                              <svg class="co-mention-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M6 4l4 4-4 4" />
                              </svg>
                              {cm.entity.name}
                            </span>
                            <span class="co-mention-type">
                              {cm.entity.type === "player" ? "Player" : "Team"}{team()}
                            </span>
                          </span>
                          <span class="co-mention-count">{cm.mentionCount} {countLabel()}</span>
                        </summary>
                        <div class="co-mention-articles">
                          <Show
                            when={shared().length > 0}
                            fallback={<p class="co-mention-articles-empty">No shared mentions found.</p>}
                          >
                            <For each={shared()}>
                              {(article) => {
                                const articleUrl = () => article.url || article.link || "#";
                                const source = () => article.source || "";
                                const date = () => formatDate(article.pub_date || article.published_at || undefined);
                                const meta = () => `${source()}${source() && date() ? " · " : ""}${date()}`;
                                const isTweet = () => article.kind === "tweet";
                                return (
                                  <div class="co-mention-article" classList={{ "co-mention-tweet": isTweet() }}>
                                    <Show when={isTweet()}>
                                      <span class="co-mention-article-badge">X</span>
                                    </Show>
                                    <p class="co-mention-article-title">
                                      <a href={articleUrl()} target="_blank" rel="noopener noreferrer">
                                        {article.title || "Untitled"}
                                      </a>
                                    </p>
                                    <Show when={meta()}>
                                      <span class="co-mention-article-meta">{meta()}</span>
                                    </Show>
                                  </div>
                                );
                              }}
                            </For>
                          </Show>
                        </div>
                      </details>
                    </li>
                  );
                }}
              </For>
            </ul>
          )}
        </Show>
      </Show>
    </div>
  );
}
