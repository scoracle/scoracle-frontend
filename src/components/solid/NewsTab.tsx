/**
 * NewsTab — News article list (Solid.js)
 *
 * Fetches news from the Go API and renders articles declaratively.
 * Publishes articles (including empty arrays) to $newsArticles for the
 * CoMentions tab. The fetch is gated on a one-shot latch — `props.active`
 * never re-fires the resource after the user clicks away and back.
 */

import { createMemo, createEffect, createResource, Show, For } from 'solid-js';
import { isServer } from 'solid-js/web';

import { swrFetch, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import { newsUrl } from '../../lib/utils/data-sources';
import { sanitizeUrl } from '../../lib/utils/url';
import { formatDate } from '../../lib/utils/date';
import { $newsArticles } from '../../stores/news';
import { useProfile } from '../../contexts/profile';
import type { NewsArticle, NewsData } from '../../lib/types';
import './content-tabs.css';
import './NewsTab.css';

export default function NewsTab(props: { active: () => boolean }) {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // One-shot latch: stays true once `props.active` has been true at any point.
  // Gated on `!isServer` so the resource never fires on SSR — the server-side
  // fetch from the worker would hit api.scoracle.com without a browser Origin
  // and get blocked, surfacing as a 403 in the ErrorBoundary.
  const shouldLoad = createMemo<boolean>(
    prev => prev || (!isServer && props.active()),
    false,
  );

  async function fetchNews(): Promise<NewsArticle[]> {
    if (!sport || !type || !id) return [];
    const { url, headers } = newsUrl(sport, type, id);
    const { data } = await swrFetch<NewsData>(url, { ...CACHE_PRESETS.news, headers });
    return data?.articles || [];
  }

  const [articles] = createResource(shouldLoad, fetchNews);

  // Publish articles (including empty arrays) so CoMentionsTab can
  // distinguish "still fetching" (null) from "fetched, no results" ([]).
  createEffect(() => {
    const a = articles();
    if (a !== undefined) $newsArticles.set(a);
  });

  return (
    <div>
      <Show when={shouldLoad()} fallback={
        <div class="tab-loading-skeleton">
          <div class="tab-skeleton-item tall" />
          <div class="tab-skeleton-item tall" />
          <div class="tab-skeleton-item tall" />
        </div>
      }>
        <Show when={!articles.loading} fallback={
          <div class="tab-loading-skeleton">
            <div class="tab-skeleton-item tall" />
            <div class="tab-skeleton-item tall" />
            <div class="tab-skeleton-item tall" />
          </div>
        }>
          <Show when={articles() && articles()!.length > 0} fallback={
            <div class="tab-empty-state">
              {articles.error ? 'Unable to load news' : 'No news articles found'}
            </div>
          }>
            <div class="news-list">
              <For each={articles()}>
                {(article) => (
                  <div class="news-item">
                    <h3 class="news-title">
                      <a href={sanitizeUrl(article.url) || article.url || '#'} target="_blank" rel="noopener noreferrer">
                        {article.title || 'Untitled'}
                      </a>
                    </h3>
                    <div class="news-meta">
                      {article.source || ''}
                      {article.source && article.published_at ? ' · ' : ''}
                      {formatDate(article.published_at ?? undefined)}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
