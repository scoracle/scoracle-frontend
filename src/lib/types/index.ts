/**
 * Scoracle Type Definitions
 *
 * CENTRAL SPORT CONFIGURATION - All sport definitions live here.
 * Import from this file instead of hardcoding sport values elsewhere.
 *
 * To add a new sport:
 * 1. Add to SportId type
 * 2. Add to SPORTS array below
 * 3. Add JSON data file to /public/data/{id}.json
 * 4. Update backend config.py with API-Sports settings
 */

// Entity Types
export type EntityType = 'player' | 'team';
export type SportId = 'NBA' | 'NFL' | 'FOOTBALL';

// Sport Configuration - SINGLE SOURCE OF TRUTH
// Note: Sport logos ship as raw PNGs from /public/images/. Pre-launch
// optimization (sharp / squoosh / vite-imagetools) is a follow-up — see
// docs/progress/2026-04-25_home-page-port.md.
export interface SportConfig {
  id: SportId;
  idLower: string;        // Lowercase version for URLs/files
  display: string;        // Display name
  dataFile: string;       // Path to bundled JSON data file (local DB for autocomplete)
}

export const SPORTS: readonly SportConfig[] = [
  { id: 'NBA', idLower: 'nba', display: 'NBA', dataFile: '/data/nba.json' },
  { id: 'NFL', idLower: 'nfl', display: 'NFL', dataFile: '/data/nfl.json' },
  { id: 'FOOTBALL', idLower: 'football', display: 'Football', dataFile: '/data/football.json' },
] as const;

// Helper functions for sport lookups
export function getSportById(id: string): SportConfig | undefined {
  const normalized = id.toUpperCase();
  return SPORTS.find(s => s.id === normalized);
}

export function getSportByIdLower(idLower: string): SportConfig | undefined {
  const normalized = idLower.toLowerCase();
  return SPORTS.find(s => s.idLower === normalized);
}

export function getSportDisplay(sportId: string): string {
  const sport = getSportById(sportId) || getSportByIdLower(sportId);
  return sport?.display || sportId.toUpperCase();
}

export function getValidSportIds(): SportId[] {
  return SPORTS.map(s => s.id);
}

// News article from Google News RSS
export interface NewsArticle {
  title: string;
  url: string;
  published_at: string | null;
  source: string;
  description?: string;
  image_url?: string | null;
}

// News response from GET /api/v1/news/{entity_name}
export interface NewsData {
  query: string;
  sport?: string | null;
  team?: string | null;
  hours: number;
  hours_requested?: number;
  extended?: boolean;
  count: number;
  articles: NewsArticle[];
}

// Autocomplete Types (for client-side search from bundled JSON)
export interface AutocompleteEntity {
  id: string;
  name: string;
  type: 'player' | 'team';
  team?: string;
  position?: string;        // Raw position from API (e.g., 'PG', 'SF', 'GK')
  positionGroup?: string;   // Normalized group (e.g., 'Guard', 'Forward', 'Goalkeeper')
  sport?: string;           // Sport identifier (e.g., 'nba', 'nfl', 'football') - used for multi-sport search
  aliases?: string[];       // Alternative search tokens (e.g., city name, abbreviation)
  search_tokens?: string[]; // Backend-generated normalized tokens (ASCII, lowercased)
  /** @internal Precomputed lowercase+diacritic-stripped haystack joined with `|` separators for fast autocomplete matching. */
  _searchIndex?: string;
}

// ============================================
// Meta Data Types (from /meta endpoint for local DB)
// ============================================

export interface TeamReference {
  id: number;
  name: string;
  abbreviation?: string;
  logo_url?: string;
}

export interface LeagueReference {
  id: number;
  name: string;
  country: string;
  logo_url?: string;
}

/** Player metadata from /meta endpoint for widget hydration */
export interface PlayerMeta {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  detailed_position?: string;
  photo_url?: string;
  jersey_number?: string;
  height?: string;           // cm from API
  weight?: string;           // kg from API
  nationality?: string;
  birth_country?: string;
  date_of_birth?: string;
  college?: string;
  draft_year?: number;
  team?: TeamReference;
  league?: LeagueReference;
}

/** Team metadata from /meta endpoint for widget hydration */
export interface TeamMeta {
  id: number;
  name: string;
  short_code?: string;
  logo_url?: string;
  city?: string;
  country?: string;
  venue_name?: string;
  venue_capacity?: number;
  founded?: number;
  conference?: string;
  division?: string;
  league?: LeagueReference;
}

/** Complete meta response structure from /meta endpoint */
export interface SportMetaData {
  sport: SportId;
  generatedAt: string;
  entities: AutocompleteEntity[];
  players: PlayerMeta[];
  teams: TeamMeta[];
}

