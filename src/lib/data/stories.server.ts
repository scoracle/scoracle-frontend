/**
 * Stories fetchers — the storylines/packets read surface (backend 2026-08-12).
 *
 * Two endpoints, first readers of the one-rail story archive:
 *   - getStories: /{sport}/stories — open storylines ranked by cast heat
 *     (banked character scores; the server already tie-breaks the common
 *     99-heat ties — render in served order). ?status=resolved|dormant is the
 *     archive scope, ordered by recency, and its rows carry lifespan fields
 *     instead of heat.
 *   - getStory: /{sport}/story/{id} — one storyline whole: cast with roles AND
 *     lifespans (departed members stay — the part has its own lifespan),
 *     packet headline history (the append-only supersedes chain IS the
 *     evolving story), one full latest packet, 20 attached articles,
 *     voice-product pointers. 404 (→ null) on unknown/wrong-sport id.
 *
 * Mega-storylines exist (65 cast / 150 claims / ~90KB payloads); backend caps
 * are a recorded follow-up, so the route truncates client-side. Server-bound
 * via "use server".
 */

import { query } from "@solidjs/router";
import { storiesUrl, storyUrl } from "../utils/data-sources";
import { fetchJsonOrNull } from "./fetch-json.server";

export type StoryStatus = "open" | "resolved" | "dormant";

/** A cast member on a LIST row — subjects first, capped at 6 by the server. */
export interface StoryCastRef {
  entity_type: string;
  entity_id: number;
  name: string;
  role: string | null;
}

/** One storyline on the list. Active rows carry `heat` + `cast`; archive rows
 *  (resolved/dormant) carry `cast_count` + lifespan fields instead. `headline`
 *  is null until a packet is compiled — fall back to `title`. */
export interface StoryListItem {
  storyline_id: number;
  title: string;
  status: StoryStatus;
  headline: string | null;
  report_count: number;
  last_seen_at: string | null;
  // Active scope
  heat?: number;
  story_types?: string[] | null;
  register?: string | null;
  cast?: StoryCastRef[];
  // Archive scope
  cast_count?: number;
  first_seen_at?: string | null;
  resolved_at?: string | null;
}

export interface StoriesResponse {
  page: "stories";
  sport: string;
  scope: "active" | "resolved" | "dormant";
  stories: StoryListItem[];
}

/** A cast member on the STORY page — the full membership record. Departed
 *  members keep their row (`left_at` + `exit_reason`). */
export interface StoryCastMember extends StoryCastRef {
  joined_at: string | null;
  last_seen_at: string | null;
  left_at: string | null;
  exit_reason: string | null;
}

/** One compiled snapshot in the headline history (newest first). */
export interface StoryPacketSummary {
  id: number;
  day: string;
  compiled_at: string | null;
  headline: string | null;
  story_types: string[] | null;
  register: string | null;
}

/** A grounded claim inside the latest packet. */
export interface StoryClaim {
  fact: string;
  source: string | null;
  article_id: number | null;
  story_type: string | null;
  published_at: number | null;
}

export interface StoryQuote {
  quote: string;
  source: string | null;
  entity_id: number | null;
  entity_type: string | null;
  article_id: number | null;
}

/** The packet's fact sheet — a keyed object, not a list. */
export interface StoryPacketFacts {
  result_line?: string | null;
  story_types?: string[] | null;
  member_articles?: number | null;
  entities?: Array<{
    name: string;
    role: string | null;
    sport: string;
    entity_id: number;
    entity_type: string;
  }> | null;
}

export interface StoryPacket extends StoryPacketSummary {
  claims: StoryClaim[] | null;
  quotes: StoryQuote[] | null;
  facts: StoryPacketFacts | null;
  register_phrase: string | null;
}

export interface StoryArticle {
  article_id: number;
  title: string;
  source: string | null;
  url: string;
  published_at: string | null;
  attached_at: string | null;
}

/** Voice-product endpoint pointers for an active player/team cast member —
 *  the story page uses them as the set of profile-linkable cast. */
export interface StoryVoiceProduct {
  entity_type: string;
  entity_id: number;
  name: string;
  endpoints: Record<string, string>;
}

export interface StoryPageResponse {
  page: string;
  sport: string;
  storyline_id: number;
  title: string;
  status: StoryStatus;
  story_types: string[] | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  cast: StoryCastMember[];
  packets: StoryPacketSummary[];
  latest_packet: StoryPacket | null;
  articles: StoryArticle[] | null;
  voice_products: StoryVoiceProduct[] | null;
}

async function fetchStoriesImpl(
  sport: string,
  status?: string | null,
  limit?: number,
): Promise<StoriesResponse | null> {
  "use server";
  if (!sport) return null;
  return fetchJsonOrNull<StoriesResponse>(storiesUrl(sport, status, limit), "stories");
}

export const getStories = query(fetchStoriesImpl, "stories");

async function fetchStoryImpl(
  sport: string,
  id: string | number,
): Promise<StoryPageResponse | null> {
  "use server";
  if (!sport || id == null || id === "") return null;
  return fetchJsonOrNull<StoryPageResponse>(storyUrl(sport, id), "story");
}

export const getStory = query(fetchStoryImpl, "story");
