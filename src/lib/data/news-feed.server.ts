/**
 * Unified news feed — merges news articles + entity tweets into one
 * normalized, AdSense-compliant `NewsPost[]`, server-side.
 *
 * Normalizing on the server (not in the card) matters for compliance: the
 * raw `Tweet` objects carry the full body + engagement metrics, and a
 * client-side merge would serialize all of that into the hydration payload
 * even though it's never displayed. By mapping to `NewsPost` inside this
 * "use server" function, only the compliant shape — a short excerpt,
 * attribution, and outbound URL, with NO metrics and NO full body — ever
 * crosses to the client/crawler. The page's original value lives in the
 * analytics cards; this feed just surfaces sourced news without republishing.
 *
 * Reuses the existing `getNews` / `getTwitterFeed` queries (warm cache shared
 * with the profile's other data reads); merged and sorted by recency.
 */

import { query } from "@solidjs/router";
import { getNews } from "./news.server";
import { getTwitterFeed, type Tweet } from "./twitter.server";
import type { NewsArticle } from "../types";
import { truncate } from "../utils/truncate";

export interface NewsPost {
  type: "article" | "tweet";
  /** Headline (article) or short excerpt (tweet) — links out to the source. */
  title: string;
  /** Publication name (article) or @handle (tweet). */
  source: string;
  /** Canonical outbound URL. */
  url: string;
  /** ISO timestamp; "" when unknown (sorts last). */
  timestamp: string;
}

function articleToPost(a: NewsArticle): NewsPost {
  return {
    type: "article",
    title: a.title || "Untitled",
    source: a.source || "",
    url: a.url || "",
    timestamp: a.published_at ?? "",
  };
}

function tweetToPost(t: Tweet): NewsPost {
  return {
    type: "tweet",
    title: truncate(t.text, 140),
    source: `@${t.author_username}`,
    url: `https://twitter.com/${t.author_username}/status/${t.id}`,
    timestamp: t.created_at ?? "",
  };
}

function byRecencyDesc(a: NewsPost, b: NewsPost): number {
  return (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0);
}

async function fetchNewsFeedImpl(
  sport: string,
  type: string,
  id: string,
): Promise<NewsPost[]> {
  "use server";
  if (!sport || !type || !id) return [];
  const [articles, twitter] = await Promise.all([
    getNews(sport, type, id).catch(() => [] as NewsArticle[]),
    getTwitterFeed(sport, type, id, 20).catch(() => ({ available: true, tweets: [] })),
  ]);
  const posts = [
    ...articles.map(articleToPost),
    ...(twitter?.tweets ?? []).map(tweetToPost),
  ];
  return posts.filter((p) => p.title).sort(byRecencyDesc);
}

export const getNewsFeed = query(fetchNewsFeedImpl, "news-feed");
