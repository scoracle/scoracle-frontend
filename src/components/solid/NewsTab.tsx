/**
 * NewsTab — News article list (Solid.js)
 *
 * Fetches eagerly on client mount. Publishes articles (including empty
 * arrays) to $newsArticles so CoMentionsTab can distinguish "still
 * fetching" (null) from "fetched, no results" ([]).
 */

import { createEffect, createResource, Show, For } from 'solid-js';
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

export default function NewsTab() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  async function fetchNews(): Promise<NewsArticle[]> {
    if (!sport || !type || !id) return [];
    const { url, headers } = newsUrl(sport, type, id);
    const { data } = await swrFetch<NewsData>(url, { ...CACHE_PRESETS.news, headers });
    return data?.articles || [];
  }

  // Source = `() => !isServer`: false on SSR (skeleton renders), true on
  // client (fetcher fires once after hydration).
  const [articles] = createResource(() => !isServer, fetchNews);

  // Publish articles (including empty arrays) so CoMentionsTab can
  // distinguish "still fetching" (null) from "fetched, no results" ([]).
  createEffect(() => {
    const a = articles();
    if (a !== undefined) $newsArticles.set(a);
  });

  return (
    <div>
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
    </div>
  );
}
