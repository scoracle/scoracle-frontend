/**
 * XTab — tweets linked to the profile entity (Solid.js)
 *
 * Reads via `getTwitterFeed` (src/lib/data/twitter.server.ts), which
 * combines the configured-for-sport check + the entity feed into one
 * server-side query. CoMentionsTab calls the same getTwitterFeed —
 * shared cache, no separate publish/subscribe layer.
 */

import { Show, For } from 'solid-js';
import { createAsync } from '@solidjs/router';

import { useProfile } from '../../contexts/profile';
import { sanitizeUrl } from '../../lib/utils/url';
import { formatDate } from '../../lib/utils/date';
import { getTwitterFeed, type Tweet } from '../../lib/data/twitter.server';
import Skeleton from './Skeleton';
import './content-tabs.css';
import './XTab.css';

export default function XTab() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const result = createAsync(() => getTwitterFeed(sport, type, id, 20));

  return (
    <div>
      <Show
        when={result() !== undefined}
        fallback={
          <div class="tab-loading-skeleton">
            <Skeleton shape="block" height={80} />
            <Skeleton shape="block" height={80} />
            <Skeleton shape="block" height={80} />
          </div>
        }
      >
        <Show
          when={result()?.available}
          fallback={<div class="tab-empty-state">X integration is not configured</div>}
        >
          <Show
            when={result()!.tweets.length > 0}
            fallback={<div class="tab-empty-state">No recent tweets found</div>}
          >
            <div class="x-feed">
              <For each={result()!.tweets}>
                {(tweet) => <TweetCard tweet={tweet} />}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}

function TweetCard(props: { tweet: Tweet }) {
  const t = () => props.tweet;
  const profileUrl = () => `https://twitter.com/${t().author_username}`;
  const tweetUrl = () => `${profileUrl()}/status/${t().id}`;
  const likes = () => t().metrics?.like_count ?? 0;
  const retweets = () => t().metrics?.retweet_count ?? 0;

  return (
    <article class="tweet-card">
      <header class="tweet-header">
        <a class="tweet-author" href={sanitizeUrl(profileUrl()) || '#'} target="_blank" rel="noopener noreferrer">
          <span class="tweet-author-name">{t().author || t().author_username}</span>
          <span class="tweet-author-handle">@{t().author_username}</span>
        </a>
        <span class="tweet-date">{formatDate(t().created_at)}</span>
      </header>
      <p class="tweet-text">{t().text}</p>
      <footer class="tweet-footer">
        <span class="tweet-metric">
          <span class="tweet-metric-value">{likes().toLocaleString()}</span>
          <span class="tweet-metric-label">likes</span>
        </span>
        <span class="tweet-metric">
          <span class="tweet-metric-value">{retweets().toLocaleString()}</span>
          <span class="tweet-metric-label">reposts</span>
        </span>
        <a class="tweet-link" href={sanitizeUrl(tweetUrl()) || '#'} target="_blank" rel="noopener noreferrer">
          View on X
        </a>
      </footer>
    </article>
  );
}
