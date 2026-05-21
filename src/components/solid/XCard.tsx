/**
 * XCard — tweets linked to the profile entity (Solid.js)
 *
 * Reads via `getTwitterFeed` (src/lib/data/twitter.server.ts), which
 * combines the configured-for-sport check + the entity feed into one
 * server-side query. CoMentionsCard calls the same getTwitterFeed —
 * shared cache.
 *
 * Uniform tab shape: data + render. Loading skeleton lives in the
 * named `XCardSkeleton` export and is wired via TabDef.fallback in
 * ContentShell. Empty state reuses the shared <EmptyCard>.
 */

import { Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { sanitizeUrl } from "../../lib/utils/url";
import { formatDate } from "../../lib/utils/date";
import { getTwitterFeed, type Tweet } from "../../lib/data/twitter.server";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./XCard.css";

export default function XCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const result = createAsync(() => getTwitterFeed(sport, type, id, 20));

  return (
    <Show
      when={result()?.available}
      fallback={<EmptyCard />}
    >
      <Show
        when={result()!.tweets.length > 0}
        fallback={<EmptyCard />}
      >
        <Shell as="article" class="x-card-shell" aria-label="X feed">
          <div class="x-feed">
            <For each={result()!.tweets}>
              {(tweet) => <TweetCard tweet={tweet} />}
            </For>
          </div>
        </Shell>
      </Show>
    </Show>
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
        <a class="tweet-author" href={sanitizeUrl(profileUrl()) || "#"} target="_blank" rel="noopener noreferrer">
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
        <a class="tweet-link" href={sanitizeUrl(tweetUrl()) || "#"} target="_blank" rel="noopener noreferrer">
          View on X
        </a>
      </footer>
    </article>
  );
}

export function XCardSkeleton() {
  // Skeleton sized to a typical resolved X feed — `getTwitterFeed` fetches
  // up to 20 tweets at ~140 px each = ~2800 px. Tweets are taller than
  // news items (author + body + metrics row). Predictive sizing keeps
  // first-activation CLS small without a fixed page-level reservation.
  return (
    <Shell as="article" class="x-card-shell" aria-label="X feed">
      <div class="card-loading">
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={140} />
      </div>
    </Shell>
  );
}
