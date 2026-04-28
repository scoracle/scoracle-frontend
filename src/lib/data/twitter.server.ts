/**
 * Twitter status (whether the X integration is configured for the sport)
 * and per-entity tweet feed. Two queries with separate cache keys — the
 * status response is identical across all entities and shouldn't fan
 * out to per-entity cache entries. Both fetchers carry the function-level
 * "use server" directive.
 */

import { query } from "@solidjs/router";
import { twitterEntityFeedUrl, twitterStatusUrl } from "../utils/data-sources";

export interface Tweet {
  id: string;
  text: string;
  author: string;
  author_username: string;
  created_at: string;
  metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
}

interface TwitterStatusSport {
  sport: string;
  configured: boolean;
}

export interface TwitterStatusResponse {
  bearer_token_configured?: boolean;
  sports?: TwitterStatusSport[];
}

interface TwitterFeedResponse {
  tweets?: Tweet[];
}

export interface TwitterFeed {
  available: boolean;
  tweets: Tweet[];
}

function isConfiguredForSport(
  status: TwitterStatusResponse | undefined,
  sport: string,
): boolean {
  if (!status?.bearer_token_configured) return false;
  if (!status.sports) return true;
  const match = status.sports.find(
    (s) => s.sport?.toLowerCase() === sport.toLowerCase(),
  );
  return !!match?.configured;
}

async function fetchTwitterStatusImpl(): Promise<TwitterStatusResponse | null> {
  "use server";
  const { url, headers } = twitterStatusUrl();
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return (await res.json()) as TwitterStatusResponse;
}

export const getTwitterStatus = query(fetchTwitterStatusImpl, "twitter-status");

async function fetchTwitterFeedImpl(
  sport: string,
  type: string,
  id: string,
  limit: number,
): Promise<TwitterFeed> {
  "use server";
  if (!sport || !type || !id) {
    return { available: true, tweets: [] };
  }
  const status = await fetchTwitterStatusImpl();
  if (!isConfiguredForSport(status ?? undefined, sport)) {
    return { available: false, tweets: [] };
  }
  const { url, headers } = twitterEntityFeedUrl(sport, type, id, limit);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    return { available: true, tweets: [] };
  }
  const data = (await res.json()) as TwitterFeedResponse;
  return { available: true, tweets: data?.tweets ?? [] };
}

export const getTwitterFeed = query(fetchTwitterFeedImpl, "twitter-feed");
