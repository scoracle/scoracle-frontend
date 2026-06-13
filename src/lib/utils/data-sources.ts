/**
 * Go API URL helpers.
 *
 * The base URL has two valid shapes:
 *   - Absolute (production): "https://api.scoracle.com/api/v1" — set in
 *     wrangler.jsonc, inlined by Vite into both client + server bundles.
 *   - Relative (dev): "/api/v1" — set in .env.development, used by the
 *     browser to hit Vite's dev proxy (which forwards to localhost:8000).
 *
 * The relative shape only works for browser-issued fetches; Node-side
 * `fetch` can't resolve relative URLs. With server-fn fetchers (Tier 1
 * "use server" migration), the SSR pass calls fetch() server-side, so
 * we have to resolve the relative base to a server-reachable absolute
 * URL. In dev, that's localhost:8000; in production the base is already
 * absolute, so this branch is a no-op.
 */

import { isServer } from 'solid-js/web';

export interface FetchTarget {
  url: string;
  headers: Record<string, string>;
}

interface GoEntityEnvelope<T = Record<string, unknown>> {
  entity?: T;
}

const RAW_API_BASE: string =
  import.meta.env.PUBLIC_GO_API_URL || 'http://localhost:8000/api/v1';

function resolveApiBase(): string {
  // Already absolute → use as-is on both sides.
  if (/^https?:\/\//i.test(RAW_API_BASE)) return RAW_API_BASE;
  // Relative + browser → keep relative so the dev proxy intercepts.
  if (!isServer) return RAW_API_BASE;
  // Relative + server → prepend a server-reachable absolute origin so
  // Node's fetch can resolve. localhost:8000 matches the Vite dev-proxy
  // target (vite.config.ts > server.proxy["/api"].target).
  return `http://localhost:8000${RAW_API_BASE}`;
}

const API_BASE_URL = resolveApiBase();

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
 * Canonical API format: /{sport}/{type}/{id} where type is 'player' or 'team'.
 * Optional `season` adds `?season=N`; omitting it lets the backend serve
 * the entity's most recent season (per ENDPOINTS.md).
 */
export function entityUrl(sport: string, type: string, id: string, season?: number | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const qs = season != null ? `?season=${season}` : '';
  return {
    url: `${getBaseUrl()}/${sportPath}/${type}/${id}${qs}`,
    headers: {},
  };
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

export function vibeUrl(sport: string, type: string, id: string): FetchTarget {
  const sportPath = toSportPath(sport);
  return {
    url: `${getBaseUrl()}/${sportPath}/vibe/${type}/${id}`,
    headers: {},
  };
}

export function trendsUrl(sport: string, type: string, id: string, season?: number | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const qs = season != null ? `?season=${season}` : '';
  return {
    url: `${getBaseUrl()}/${sportPath}/${type}/${id}/trends${qs}`,
    headers: {},
  };
}

/**
 * Build a team results endpoint URL.
 * Canonical API format: /{sport}/team/{id}/results?season=…
 * Returns per-game records for the team in the given season (or most recent
 * season when omitted).
 */
export function teamResultsUrl(sport: string, id: string, season?: number | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const qs = season != null ? `?season=${season}` : '';
  return {
    url: `${getBaseUrl()}/${sportPath}/team/${id}/results${qs}`,
    headers: {},
  };
}

/**
 * Build an entity sparkline (season rating) endpoint URL.
 * Returns the season Composite/Specialist rating (+ ranks + specialty + that
 * season's team) and the per-event series for one entity. Season omitted →
 * backend serves the latest. The backend route was renamed `/starline` →
 * `/sparkline` (2026-06-05); the old `/starline` path remains a deprecated alias
 * during the rollout.
 */
export function sparklineUrl(sport: string, type: string, id: string, season?: number | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const qs = season != null ? `?season=${season}` : '';
  return {
    url: `${getBaseUrl()}/${sportPath}/${type}/${id}/sparkline${qs}`,
    headers: {},
  };
}

/**
 * Build a team roster endpoint URL.
 * Canonical API format: /{sport}/team/{id}/roster?season=…
 * Every player on the team's season roster with their Composite/Specialist
 * rating, ordered by the Composite+Specialist sum. Season omitted → latest rated.
 */
export function rosterUrl(sport: string, id: string, season?: number | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const qs = season != null ? `?season=${season}` : '';
  return {
    url: `${getBaseUrl()}/${sportPath}/team/${id}/roster${qs}`,
    headers: {},
  };
}

/**
 * Build a team transfers/trades endpoint URL.
 * Canonical API format: /{sport}/team/{id}/transfers
 * The team's rumor-linked players ranked by the deterministic heat index.
 */
export function transfersUrl(sport: string, id: string): FetchTarget {
  const sportPath = toSportPath(sport);
  return {
    url: `${getBaseUrl()}/${sportPath}/team/${id}/transfers`,
    headers: {},
  };
}

/**
 * Build a player suitors endpoint URL — the player-side mirror of transfers.
 * Canonical API format: /{sport}/player/{id}/suitors
 * The teams linked with the player ("who's after them") ranked by heat.
 */
export function suitorsUrl(sport: string, id: string): FetchTarget {
  const sportPath = toSportPath(sport);
  return {
    url: `${getBaseUrl()}/${sportPath}/player/${id}/suitors`,
    headers: {},
  };
}

/**
 * Build a rating-leaderboard endpoint URL.
 * Canonical API format: /{sport}/leaderboard?entity_type=…&scope=…&season=…&limit=…
 * Positionless rating board (z-score engine). All query params optional:
 *   - `entityType` — 'player' (backend default) or 'team'
 *   - `scope` — 'composite' (default), 'specialist', or a specialty label
 *   - `season` — defaults to the latest rated season
 *   - `limit` — max rows (backend default 50)
 */
export function leaderboardUrl(
  sport: string,
  entityType?: string,
  scope?: string,
  season?: number | null,
  limit?: number,
  cohort?: { position?: string | null; leagueId?: number | null; conference?: string | null; division?: string | null },
): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (entityType) params.set('entity_type', entityType);
  if (scope) params.set('scope', scope);
  if (season != null) params.set('season', String(season));
  if (limit != null) params.set('limit', String(limit));
  if (cohort?.position) params.set('position', cohort.position);
  if (cohort?.leagueId != null) params.set('league_id', String(cohort.leagueId));
  if (cohort?.conference) params.set('conference', cohort.conference);
  if (cohort?.division) params.set('division', cohort.division);
  const qs = params.toString();
  return {
    url: `${getBaseUrl()}/${sportPath}/leaderboard${qs ? `?${qs}` : ''}`,
    headers: {},
  };
}

/**
 * Sport-wide VIBES board — entities ranked by their latest sentiment (1-100) in
 * the last 48h. Enriched (name/image/team). `entity_type` omitted ⇒ both.
 * Canonical API format: /{sport}/leaderboard/vibes?entity_type=…&limit=…
 */
export function vibesLeaderboardUrl(sport: string, entityType?: string, limit?: number): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (entityType) params.set('entity_type', entityType);
  if (limit != null) params.set('limit', String(limit));
  const qs = params.toString();
  return { url: `${getBaseUrl()}/${sportPath}/leaderboard/vibes${qs ? `?${qs}` : ''}`, headers: {} };
}

/**
 * Sport-wide TRANSFERS board — hottest Gemma-vetted (team, player) rumors by heat.
 * Canonical API format: /{sport}/leaderboard/transfers?limit=…
 */
export function transfersLeaderboardUrl(sport: string, limit?: number): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  const qs = params.toString();
  return { url: `${getBaseUrl()}/${sportPath}/leaderboard/transfers${qs ? `?${qs}` : ''}`, headers: {} };
}
