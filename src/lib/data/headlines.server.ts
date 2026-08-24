/**
 * Week-archive fetcher (/{sport}/{type}/{id}/headlines?year=&week=) — the card
 * contract's index (2026-08-24): every consumer seat's (score, headline, body)
 * entries for one Jan-1-anchored week, merged newest-first.
 *
 * Entries exist only where a generation carried a headline, so the archive
 * reaches back exactly as far as the headline contract's rollout (backend
 * migs 226/232). The Journalist's entries carry their storylines as `items`;
 * every other seat is a single `body`. The Scout's archive score is null (his
 * card number is the rating — season state, not a generation field).
 */

import { query } from "@solidjs/router";

import { fetchJsonOrNull } from "./fetch-json.server";
import { headlinesUrl } from "../utils/data-sources";
import type { ProfileTab } from "../../contexts/profile";

/** One archived generation: the seat, its triple, and when it was filed. */
export interface HeadlineEntry {
  /** Which card this entry belongs to ("narratives", "vibe", …). */
  card: Exclude<ProfileTab, never>;
  generated_at: string;
  /** The seat's own score for that generation; null where the seat has none. */
  score: number | null;
  headline: string;
  /** The single-body seats' prose; null for the Journalist (see `items`). */
  body: string | null;
  /** The Journalist's storylines (title + body, impact-ranked); null elsewhere. */
  items: Array<{ title: string; body: string }> | null;
}

export interface HeadlinesResponse {
  page: "headlines";
  sport: string;
  entity_type: string;
  entity_id: number;
  year: number;
  week: number;
  starts_at: string;
  ends_at: string;
  entries: HeadlineEntry[];
}

async function fetchHeadlinesImpl(
  sport: string,
  type: string,
  id: string,
  year: number,
  week: number,
): Promise<HeadlinesResponse | null> {
  "use server";
  if (!sport || !id) return null;
  return fetchJsonOrNull<HeadlinesResponse>(
    headlinesUrl(sport, type, id, year, week),
    "headlines",
  );
}

export const getHeadlines = query(fetchHeadlinesImpl, "headlines");
