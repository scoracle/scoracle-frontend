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
}

export const SPORTS: readonly SportConfig[] = [
  { id: 'NBA', idLower: 'nba', display: 'NBA' },
  { id: 'NFL', idLower: 'nfl', display: 'NFL' },
  { id: 'FOOTBALL', idLower: 'football', display: 'Football' },
] as const;

// Helper functions for sport lookups
function getSportById(id: string): SportConfig | undefined {
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

// Display fields for entity search and selection.
export interface AutocompleteEntity {
  id: string;
  name: string;
  type: 'player' | 'team';
  team?: string;
  position?: string;        // Raw position from API (e.g., 'PG', 'SF', 'GK')
  positionGroup?: string;   // Normalized group (e.g., 'Guard', 'Forward', 'Goalkeeper')
  sport?: string;           // Sport identifier (e.g., 'nba', 'nfl', 'football') - used for multi-sport search
  conference?: string;
  league?: { id: number; name: string };
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
  draft_round?: number;
  draft_pick?: number;
  age?: number;
  experience?: string;
  team?: TeamReference;
  league?: LeagueReference;
  primary_color?: string | null;
  secondary_color?: string | null;
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
  primary_color?: string | null;
  secondary_color?: string | null;
}

