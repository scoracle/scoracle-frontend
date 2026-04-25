/**
 * NewsTab — News article list (Solid.js island)
 *
 * Fetches news from the Go API and renders articles declaratively.
 * Publishes articles to $newsArticles nanostore for the CoMentions tab.
 * Loads reactively when the tab becomes active via the isActive accessor.
 */

import { createSignal, createEffect, createResource, Show, For } from 'solid-js';

import { swrFetch, setPageData, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import { newsUrl } from '../../lib/utils/data-sources';
import { sanitizeUrl } from '../../lib/utils/url';
import { formatDate } from '../../lib/utils/date';
import { $newsArticles } from '../../stores/news';
import type { NewsArticle, NewsData } from '../../lib/types';
import './content-tabs.css';
import './NewsTab.css';

export default function NewsTab(props: { active: () => boolean }) {
  const params = new URLSearchParams(window.location.search);
  const sport = params.get('sport')?.toLowerCase() || '';
  const type = params.get('type') || 'player';
  const id = params.get('id') || '';

  const isActive = () => props.active();
  const [shouldLoad, setShouldLoad] = createSignal(false);

  // Load when tab becomes active for the first time
  createEffect(() => {
    if (isActive() && !shouldLoad()) setShouldLoad(true);
  });

  async function fetchNews(): Promise<NewsArticle[]> {
    if (!shouldLoad() || !sport || !type || !id) return [];
    const { url, headers } = newsUrl(sport, type, id);
    const { data } = await swrFetch<NewsData>(url, { ...CACHE_PRESETS.news, headers });
    return data?.articles || [];
  }

  const [articles] = createResource(shouldLoad, fetchNews);

  // Publish articles for CoMentions tab
  createEffect(() => {
    const a = articles();
    if (a && a.length > 0) {
      $newsArticles.set(a);
      setPageData('news', { articles: a });
    }
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
