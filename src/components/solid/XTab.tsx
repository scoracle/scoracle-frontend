/**
 * XTab — tweets linked to the profile entity.
 *
 * Reads from /{sport}/twitter/{type}/{id} (tweet_entities join on the
 * backend). Publishes results to $tweets + pageData['tweets'] so
 * CoMentionsTab can fold them into co-mention scanning.
 */

import { createMemo, createEffect, createResource, Show, For } from 'solid-js';
import { isServer } from 'solid-js/web';

import { swrFetch, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import {
  twitterEntityFeedUrl,
  twitterStatusUrl,
} from '../../lib/utils/data-sources';
import { useProfile } from '../../contexts/profile';
import { sanitizeUrl } from '../../lib/utils/url';
import { formatDate } from '../../lib/utils/date';
import { $tweets, type Tweet } from '../../stores/tweets';
import './content-tabs.css';
import './XTab.css';

interface TwitterStatusSport {
  sport: string;
  configured: boolean;
}

interface TwitterStatusResponse {
  bearer_token_configured?: boolean;
  sports?: TwitterStatusSport[];
}

interface TwitterFeedResponse {
  tweets?: Tweet[];
}

interface XResult {
  available: boolean;
  tweets: Tweet[];
}

function isConfiguredForSport(status: TwitterStatusResponse | undefined, sport: string): boolean {
  if (!status?.bearer_token_configured) return false;
  // When per-sport data is provided, require an explicit configured entry.
  // Fall back to the global flag only if the sports array is absent entirely.
  if (!status.sports) return true;
  const match = status.sports.find((s) => s.sport?.toLowerCase() === sport.toLowerCase());
  return !!match?.configured;
}

export default function XTab(props: { active: () => boolean }) {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // One-shot latch: stays true once `props.active` has been true at any point.
  // Gated on `!isServer` so the resource never fires on SSR.
  const shouldLoad = createMemo<boolean>(
    prev => prev || (!isServer && props.active()),
    false,
  );

  async function fetchFeed(): Promise<XResult> {
    if (!sport || !type || !id) {
      return { available: true, tweets: [] };
    }

    const statusRes = await swrFetch<TwitterStatusResponse>(
      twitterStatusUrl().url,
      { ...CACHE_PRESETS.twitter },
    ).catch(() => ({ data: undefined as TwitterStatusResponse | undefined }));

    if (!isConfiguredForSport(statusRes.data, sport)) {
      return { available: false, tweets: [] };
    }

    const { url, headers } = twitterEntityFeedUrl(sport, type, id, 20);
    const { data } = await swrFetch<TwitterFeedResponse>(url, { ...CACHE_PRESETS.twitter, headers });
    return { available: true, tweets: data?.tweets || [] };
  }

  const [result] = createResource(shouldLoad, fetchFeed);

  // Publish tweets for CoMentionsTab consumption.
  createEffect(() => {
    const r = result();
    if (r?.available && r.tweets.length > 0) $tweets.set(r.tweets);
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
        <Show when={!result.loading} fallback={
          <div class="tab-loading-skeleton">
            <div class="tab-skeleton-item tall" />
            <div class="tab-skeleton-item tall" />
            <div class="tab-skeleton-item tall" />
          </div>
        }>
          <Show when={result()?.available} fallback={
            <div class="tab-empty-state">X integration is not configured</div>
          }>
            <Show when={result()!.tweets.length > 0} fallback={
              <div class="tab-empty-state">
                {result.error ? 'Unable to load tweets' : 'No recent tweets found'}
              </div>
            }>
              <div class="x-feed">
                <For each={result()!.tweets}>
                  {(tweet) => (
                    <TweetCard tweet={tweet} />
                  )}
                </For>
              </div>
            </Show>
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
