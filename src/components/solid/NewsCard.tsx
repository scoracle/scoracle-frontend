/**
 * NewsCard — unified, compliant feed of third-party posts (news articles +
 * tweets) for the profile "News" tab.
 *
 * Both sources normalize to one `NewsPost` shape and render through one row
 * template: a short title/excerpt that links out to the source, an
 * attribution line, and a small type badge. This is the AdSense-compliant
 * "snapshot + cite + link to source" pattern — tweets show a truncated
 * excerpt (never the full reproduced body) and DROP engagement metrics, so
 * the page surfaces sourced news without republishing it. The page's
 * original value lives in the analytics cards (Vibe/Trends/Stats), which is
 * what makes this aggregation legitimate.
 *
 * Reads `getNews` + `getTwitterFeed` via `createAsync` (shared query cache
 * with CoMentionsCard). Merged into one feed sorted by recency.
 */

import { Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import { sanitizeUrl } from "../../lib/utils/url";
import { formatDate } from "../../lib/utils/date";
import { getNewsFeed } from "../../lib/data/news-feed.server";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./NewsCard.css";

export default function NewsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // One server query returns the normalized, compliant feed — tweet bodies
  // are truncated and metrics dropped server-side, so the raw data never
  // reaches the client payload.
  const feed = createAsync(() => getNewsFeed(sport, type, id));

  return (
    <Show when={(feed()?.length ?? 0) > 0} fallback={<EmptyCard />}>
      <Shell as="article" class="news-card-shell" aria-label="News">
        <div class="news-list">
          <For each={feed()}>
            {(post) => (
              <div class="news-item">
                <h3 class="news-title">
                  <a
                    href={sanitizeUrl(post.url) || post.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {post.title}
                  </a>
                </h3>
                <div class="news-meta">
                  <span
                    class="news-type"
                    classList={{ "news-type-x": post.type === "tweet" }}
                  >
                    {post.type === "tweet" ? "X" : "NEWS"}
                  </span>
                  <Show when={post.source}>
                    <span class="news-source">{post.source}</span>
                  </Show>
                  <Show when={post.timestamp}>
                    <span class="news-date">{formatDate(post.timestamp)}</span>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Shell>
    </Show>
  );
}

export function NewsCardSkeleton() {
  // Sized to a typical merged feed (~8 rows at ~64 px). Predictive sizing
  // keeps first-activation CLS small without a page-level reservation.
  return (
    <Shell as="article" class="news-card-shell" aria-label="News">
      <div class="card-loading">
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
      </div>
    </Shell>
  );
}
