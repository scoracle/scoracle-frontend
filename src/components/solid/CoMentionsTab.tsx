/**
 * CoMentionsTab — Co-mentioned entities list (Solid.js island)
 *
 * Waits for news articles, cross-references with entity DB, and renders
 * expandable rows with native <details>. Loads reactively when the tab
 * becomes active via the isActive accessor.
 */

import { createSignal, createEffect, createResource, Show, For } from 'solid-js';

import { waitForPageData, getPageData } from '../../lib/utils/api-fetcher';
import { findCoMentions, entityMatchesText, loadEntitiesForSport, type Article, type CoMention } from '../../lib/utils/co-mentions';
import { formatDate } from '../../lib/utils/date';
import { useProfile } from '../../contexts/profile';
import type { Tweet } from '../../stores/tweets';
import './content-tabs.css';
import './CoMentionsTab.css';

function tweetToArticle(tweet: Tweet): Article & { kind: 'tweet'; author?: string } {
  return {
    kind: 'tweet',
    title: tweet.text,
    url: `https://twitter.com/${tweet.author_username}/status/${tweet.id}`,
    published_at: tweet.created_at,
    source: `@${tweet.author_username}`,
    author: tweet.author,
  };
}

export default function CoMentionsTab(props: { active: () => boolean }) {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const isActive = () => props.active();
  const [shouldLoad, setShouldLoad] = createSignal(false);

  createEffect(() => {
    if (isActive() && !shouldLoad()) setShouldLoad(true);
  });

  async function fetchCoMentions(): Promise<{ coMentions: CoMention[]; articles: Article[] } | null> {
    if (!sport || !type || !id) return null;

    // News is expected; tweets are best-effort (only if the X tab has loaded).
    const [newsData, tweetsData] = await Promise.all([
      waitForPageData('news', 3000).catch(() => null) as Promise<{ articles?: Article[] } | null>,
      Promise.resolve(getPageData('tweets') as { tweets?: Tweet[] } | undefined),
    ]);

    const newsArticles = newsData?.articles || [];
    const tweetArticles = (tweetsData?.tweets || []).map(tweetToArticle);
    const articles: Article[] = [...newsArticles, ...tweetArticles];

    if (articles.length === 0) return null;

    const entities = await loadEntitiesForSport(sport);
    const coMentions = findCoMentions(articles, entities, id, type);
    return coMentions.length > 0 ? { coMentions, articles } : null;
  }

  const [data] = createResource(shouldLoad, fetchCoMentions);

  function sharedArticles(cm: CoMention, articles: Article[]) {
    return articles.filter(a => a.title && entityMatchesText(cm.entity.name, a.title));
  }

  return (
    <div>
      <Show when={shouldLoad()} fallback={
        <div class="tab-loading-skeleton">
          <div class="tab-skeleton-item" /><div class="tab-skeleton-item" /><div class="tab-skeleton-item" />
        </div>
      }>
        <Show when={!data.loading} fallback={
          <div class="tab-loading-skeleton">
            <div class="tab-skeleton-item" /><div class="tab-skeleton-item" /><div class="tab-skeleton-item" />
          </div>
        }>
          <Show when={data()} fallback={
            <div class="tab-empty-state">No co-mentions found in recent articles</div>
          }>
            {(result) => (
              <ul class="co-mentions-list">
                <For each={result().coMentions}>
                  {(cm) => {
                    const team = () => cm.entity.team ? ` - ${cm.entity.team}` : '';
                    const countLabel = () => cm.mentionCount === 1 ? 'mention' : 'mentions';
                    const shared = () => sharedArticles(cm, result().articles);

                    return (
                      <li class="co-mention-item">
                        <details class="co-mention-details">
                          <summary class="co-mention-summary">
                            <span class="co-mention-info">
                              <span class="co-mention-name">
                                <svg class="co-mention-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
                                {cm.entity.name}
                              </span>
                              <span class="co-mention-type">
                                {cm.entity.type === 'player' ? 'Player' : 'Team'}{team()}
                              </span>
                            </span>
                            <span class="co-mention-count">{cm.mentionCount} {countLabel()}</span>
                          </summary>
                          <div class="co-mention-articles">
                            <Show when={shared().length > 0} fallback={
                              <p class="co-mention-articles-empty">No shared mentions found.</p>
                            }>
                              <For each={shared()}>
                                {(article) => {
                                  const articleUrl = () => article.url || article.link || '#';
                                  const source = () => article.source || '';
                                  const date = () => formatDate(article.pub_date || article.published_at || undefined);
                                  const meta = () => `${source()}${source() && date() ? ' · ' : ''}${date()}`;
                                  const isTweet = () => article.kind === 'tweet';
                                  return (
                                    <div class="co-mention-article" classList={{ 'co-mention-tweet': isTweet() }}>
                                      <Show when={isTweet()}>
                                        <span class="co-mention-article-badge">X</span>
                                      </Show>
                                      <p class="co-mention-article-title">
                                        <a href={articleUrl()} target="_blank" rel="noopener noreferrer">
                                          {article.title || 'Untitled'}
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
      </Show>
    </div>
  );
}
