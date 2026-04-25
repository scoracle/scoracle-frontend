/**
 * Sport Store — cross-island reactive state for the active sport
 *
 * Uses nanostores so all Solid islands can subscribe reactively.
 * Persists to sessionStorage + localStorage for page-reload continuity.
 */

import { atom } from 'nanostores';

const SESSION_KEY = 'sessionSport';
const LOCAL_STORAGE_KEY = 'activeSport';

function readPersistedSport(): string {
  try {
    return sessionStorage.getItem(SESSION_KEY)
      || localStorage.getItem(LOCAL_STORAGE_KEY)
      || 'nba';
  } catch {
    return 'nba';
  }
}

export const $currentSport = atom<string>(readPersistedSport());

/**
 * Change the active sport. Persists to storage for page-reload continuity.
 */
export function setSport(sport: string) {
  $currentSport.set(sport);

  try {
    sessionStorage.setItem(SESSION_KEY, sport);
    localStorage.setItem(LOCAL_STORAGE_KEY, sport);
  } catch { /* storage unavailable */ }
}
