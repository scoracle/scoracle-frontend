/**
 * CoMentionsTab — Co-mentioned entities list (Solid.js)
 *
 * Reads news + tweets via the SAME `query()`-cached server-fns that
 * ArticlesCard and XTab call, plus the sport's entity directory via
 * `getEntities` (bundled JSON, preloaded by the route's firePreloads).
 *
 * Uniform tab shape: data + render. The aggregation memo runs inside
 * TabContainer's <Suspense> scope (since this component is rendered
 * as TabContainer's child), so reads of pending createAsyncs propagate
 * to the right Suspense and never bubble to the route's root.
 */

import { createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import {
  findCoMentions,
  entityMatchesText,
  type Article,
  type CoMention,
} from "../../lib/utils/co-mentions";
import { formatDate } from "../../lib/utils/date";
import { useProfile } from "../../contexts/profile";
import { getNews } from "../../lib/data/news.server";
import { getTwitterFeed, type Tweet } from "../../lib/data/twitter.server";
import { getEntities } from "../../lib/data/entities";
import Skeleton from "./Skeleton";
import "./content-tabs.css";
import "./CoMentionsTab.css";

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

  const news = createAsync(() => getNews(sport, type, id));
  const twitter = createAsync(() => getTwitterFeed(sport, type, id, 20));
  const entities = createAsync(() => getEntities(sport));

  const result = createMemo(() => {
    if (!sport || !type || !id) return null;
    const e = entities();
    const n = news();
    if (!e || n === undefined) return null;
    const t = twitter();
    const tweetArticles = (t?.available && t.tweets.length ? t.tweets : []).map(tweetToArticle);
    const articles: Article[] = [...n, ...tweetArticles];
    if (articles.length === 0) return null;
    const coMentions = findCoMentions(articles, e, id, type);
    return coMentions.length > 0 ? { coMentions, articles } : null;
  });

  function sharedArticles(cm: CoMention, articles: Article[]) {
    return articles.filter((a) => a.title && entityMatchesText(cm.entity.name, a.title));
  }

  return (
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
  );
}

export function CoMentionsTabSkeleton() {
  return (
    <div class="tab-loading-skeleton">
      <Skeleton shape="block" height={56} />
      <Skeleton shape="block" height={56} />
      <Skeleton shape="block" height={56} />
    </div>
  );
}
