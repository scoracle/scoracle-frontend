/**
 * News fetcher — server-side via SolidStart's "use server" directive
 * applied at function level. The TanStack server-functions plugin in
 * SolidStart 2.0-alpha.2 picks up the directive and emits a thin client
 * proxy that POSTs to /_server during client-side calls; on SSR the
 * function runs in-process. `query()` wraps it for per-key cache + dedup.
 */

import { query } from "@solidjs/router";
import { newsUrl } from "../utils/data-sources";
import type { NewsArticle, NewsData } from "../types";

async function fetchNewsImpl(
  sport: string,
  type: string,
  id: string,
): Promise<NewsArticle[]> {
  "use server";
  if (!sport || !type || !id) return [];
  const { url, headers } = newsUrl(sport, type, id);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`news ${res.status}`);
  }
  const data = (await res.json()) as NewsData;
  return data.articles ?? [];
}

export const getNews = query(fetchNewsImpl, "news");
