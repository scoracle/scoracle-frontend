/**
 * Go API URL helpers.
 *
 * The API base URL is a compile-time constant, inlined by Vite from
 * PUBLIC_GO_API_URL. See astro.config.mjs for the build-time check and
 * wrangler.jsonc for the SSR runtime value. There is exactly one source
 * of truth per build; no client-side fallbacks or hydration tricks.
 */

export interface FetchTarget {
  url: string;
  headers: Record<string, string>;
}

interface GoEntityEnvelope<T = Record<string, unknown>> {
  entity?: T;
}

const API_BASE_URL: string =
  import.meta.env.PUBLIC_GO_API_URL || 'http://localhost:8000/api/v1';

function toSportPath(sport: string): string {
  const normalized = sport.trim().toUpperCase();
  if (normalized === 'NBA') return 'nba';
  if (normalized === 'NFL') return 'nfl';
  if (normalized === 'FOOTBALL') return 'football';
  return sport.trim().toLowerCase();
}

export function getBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Unwrap Go page/envelope responses into the entity object expected by UI widgets.
 */
export function unwrapEntityPayload<T = Record<string, unknown>>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as GoEntityEnvelope<T>;
  return envelope.entity ?? (payload as T);
}

/**
 * Build a unified entity endpoint URL.
 * Uses canonical API format: /{sport}/{entityType}/{id}
 * where entityType is singular: 'player' or 'team'
 */
export function entityUrl(sport: string, type: string, id: string): FetchTarget {
  const sportPath = toSportPath(sport);
  // Canonical endpoint uses singular entity type (player/team)
  return {
    url: `${getBaseUrl()}/${sportPath}/${type}/${id}`,
    headers: {},
  };
}

/**
 * Legacy-compatible helper for profile consumers.
 */
export function profileUrl(sport: string, type: string, id: string): FetchTarget {
  return entityUrl(sport, type, id);
}

/**
 * Legacy-compatible helper for stats consumers.
 */
export function statsUrl(sport: string, type: string, id: string): FetchTarget {
  return entityUrl(sport, type, id);
}

export function newsUrl(sport: string, type: string, id: string, limit?: number): FetchTarget {
  const params = new URLSearchParams();
  params.set('sport', sport.toUpperCase());
  if (limit) params.set('limit', String(limit));

  return {
    url: `${getBaseUrl()}/news/${type}/${id}?${params.toString()}`,
    headers: {},
  };
}

export function twitterStatusUrl(): FetchTarget {
  return {
    url: `${getBaseUrl()}/twitter/status`,
    headers: {},
  };
}

/** Tweets linked to a specific entity via tweet_entities join. */
export function twitterEntityFeedUrl(sport: string, type: string, id: string, limit?: number): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return {
    url: `${getBaseUrl()}/${sportPath}/twitter/${type}/${id}${qs ? `?${qs}` : ''}`,
    headers: {},
  };
}

/** Full journalist feed for a sport (not entity-filtered). */
export function twitterSportFeedUrl(sport: string, limit?: number): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return {
    url: `${getBaseUrl()}/${sportPath}/twitter/feed${qs ? `?${qs}` : ''}`,
    headers: {},
  };
}

export function vibeUrl(sport: string, type: string, id: string): FetchTarget {
  const sportPath = toSportPath(sport);
  return {
    url: `${getBaseUrl()}/${sportPath}/vibe/${type}/${id}`,
    headers: {},
  };
}

export function vibeHistoryUrl(sport: string, type: string, id: string, limit?: number): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return {
    url: `${getBaseUrl()}/${sportPath}/vibe/${type}/${id}/history${qs ? `?${qs}` : ''}`,
    headers: {},
  };
}

