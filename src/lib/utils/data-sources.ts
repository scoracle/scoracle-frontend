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

export function newsUrl(sport: string, type: string, id: string, limit?: number): FetchTarget {
  const params = new URLSearchParams();
  params.set('sport', sport.toUpperCase());
  if (limit) params.set('limit', String(limit));

  return {
    url: `${getBaseUrl()}/news/${type}/${id}?${params.toString()}`,
    headers: {},
  };
}

/**
 * Build a per-entity PRODUCT endpoint URL — the canonical shape for the per-card
 * products: /{sport}/{type}/{id}/{product}. `season` adds `?season=N` for the
 * stats-source products; `scope` adds the historical News/Transfers scope.
 * Each card fetches exactly its own product.
 */
export function entityProductUrl(
  sport: string,
  type: string,
  id: string,
  product: 'news' | 'transfers' | 'vibes' | 'stats' | 'sigil' | 'rating' | 'trends' | 'momentum',
  season?: number | null,
  scope?: string | null,
): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (season != null) params.set('season', String(season));
  if (scope) params.set('scope', scope);
  const qs = params.toString();
  return {
    url: `${getBaseUrl()}/${sportPath}/${type}/${id}/${product}${qs ? `?${qs}` : ''}`,
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

/** Trending board — the RISERS: entities ranked by the recent rise (delta) of their
 *  trajectory. metric=vibe (default, sentiment trend) | rating (composite trend).
 *  Canonical API format: /{sport}/leaderboard/trending?metric=…&entity_type=…&limit=… */
export function trendingLeaderboardUrl(sport: string, metric?: string, entityType?: string, limit?: number): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (metric) params.set('metric', metric);
  if (entityType) params.set('entity_type', entityType);
  if (limit != null) params.set('limit', String(limit));
  const qs = params.toString();
  return { url: `${getBaseUrl()}/${sportPath}/leaderboard/trending${qs ? `?${qs}` : ''}`, headers: {} };
}

/** News board — the hottest Gemma narratives by per-narrative impact (each row is
 *  an entity's top current narrative). Repointed from the old mention-count board. */
export function newsLeaderboardUrl(sport: string, entityType?: string, limit?: number, scope?: string | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (entityType) params.set('entity_type', entityType);
  if (limit != null) params.set('limit', String(limit));
  if (scope) params.set('scope', scope);
  const qs = params.toString();
  return { url: `${getBaseUrl()}/${sportPath}/leaderboard/news${qs ? `?${qs}` : ''}`, headers: {} };
}

/**
 * Sport-wide TRANSFERS board — hottest Gemma-vetted (team, player) rumors by heat.
 * Canonical API format: /{sport}/leaderboard/transfers?limit=…
 */
export function transfersLeaderboardUrl(sport: string, limit?: number, scope?: string | null): FetchTarget {
  const sportPath = toSportPath(sport);
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (scope) params.set('scope', scope);
  const qs = params.toString();
  return { url: `${getBaseUrl()}/${sportPath}/leaderboard/transfers${qs ? `?${qs}` : ''}`, headers: {} };
}
