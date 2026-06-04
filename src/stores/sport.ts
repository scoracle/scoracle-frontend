/**
 * Sport Store — cross-island reactive state for the active sport
 *
 * Uses nanostores so all Solid islands can subscribe reactively.
 * Persists to sessionStorage + localStorage for page-reload continuity.
 */

import { atom } from 'nanostores';

const SESSION_KEY = 'sessionSport';
const LOCAL_STORAGE_KEY = 'activeSport';

// SSR-safe: a constant default at module-eval. Reading sessionStorage/localStorage
// at module load throws on the server (no `window`) AND, on the client, seeds a
// value that diverges from the server's — a hydration mismatch present from the
// very first node, which can desync Solid's in-order hydration walk and blank
// whatever renders after it (this caused the blank profile on direct/shared-link
// loads). So init to a constant and let each page set the sport explicitly
// (profile from its URL, home from the CrystalBall carousel). setSport still
// write-throughs to storage for any future cross-reload restore.
export const $currentSport = atom<string>('nba');

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
