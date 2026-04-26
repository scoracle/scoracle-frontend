/**
 * CoMentionsTab — Co-mentioned entities list (Solid.js)
 *
 * Reactive derivation: subscribes to $newsArticles + $tweets, loads the
 * sport's entity directory once on activation, and re-derives co-mentions
 * whenever any of those change. SWR revalidations propagate live —
 * NewsTab refreshing the article list updates the co-mention list
 * without a refetch here.
 */

import { createMemo, createResource, Show, For } from 'solid-js';
import { isServer } from 'solid-js/web';
import { useStore } from '@nanostores/solid';

import {
  findCoMentions, entityMatchesText, loadEntitiesForSport,
  type Article, type CoMention, type Entity,
} from '../../lib/utils/co-mentions';
import { formatDate } from '../../lib/utils/date';
import { useProfile } from '../../contexts/profile';
import { $newsArticles } from '../../stores/news';
import { $tweets, type Tweet } from '../../stores/tweets';
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

  // One-shot latch: stays true once `props.active` has been true at any point.
  // Gated on `!isServer` so the resource never fires on SSR.
  const shouldLoad = createMemo<boolean>(
    prev => prev || (!isServer && props.active()),
    false,
  );

  const news = useStore($newsArticles);
  const tweets = useStore($tweets);

  // One-shot async: load the sport's entity directory on first activation.
  // Only refetches if `sport` or `shouldLoad` changes meaningfully.
  const [entities] = createResource<Entity[] | null, string>(
    () => (shouldLoad() && sport ? sport : false),
    (s) => loadEntitiesForSport(s),
  );

  const result = createMemo(() => {
    if (!sport || !type || !id) return null;
    const e = entities();
    const n = news();
    if (!e || n === null) return null; // entities and news must both be ready
    const tweetArticles = tweets().map(tweetToArticle);
    const articles: Article[] = [...n, ...tweetArticles];
    if (articles.length === 0) return null;
    const coMentions = findCoMentions(articles, e, id, type);
    return coMentions.length > 0 ? { coMentions, articles } : null;
  });

  const stillLoading = () =>
    !shouldLoad() || entities.loading || news() === null;

  function sharedArticles(cm: CoMention, articles: Article[]) {
    return articles.filter(a => a.title && entityMatchesText(cm.entity.name, a.title));
  }

  return (
    <div>
      <Show
        when={!stillLoading()}
        fallback={
          <div class="tab-loading-skeleton">
            <div class="tab-skeleton-item" /><div class="tab-skeleton-item" /><div class="tab-skeleton-item" />
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
                  const team = () => cm.entity.team ? ` - ${cm.entity.team}` : '';
                  const countLabel = () => cm.mentionCount === 1 ? 'mention' : 'mentions';
                  const shared = () => sharedArticles(cm, r().articles);

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
    </div>
  );
}
