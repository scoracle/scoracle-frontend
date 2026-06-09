/**
 * Stale-chunk recovery.
 *
 * Hashed route chunks (e.g. `leaderboard-B58MvjH-.js`) are replaced on every deploy and
 * the old ones are purged. A browser holding a stale module graph (an open tab, or a
 * cached index from a previous deploy) then 404s on the old chunk when it lazy-loads a
 * route — surfacing as "Failed to fetch dynamically imported module" in the error
 * boundary. The freshly-served index references the NEW hash, so a single full reload
 * self-heals it.
 *
 * Guarded by a short sessionStorage window so a chunk that is genuinely missing (404s
 * even on a fresh load — a real broken deploy) shows the error instead of reload-looping.
 */

const KEY = "scoracle:chunk-reload";
const WINDOW_MS = 10_000;

/** True when an error looks like a failed dynamic import of a (stale) route chunk. */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(
    msg,
  );
}

/** Reload once to pick up the fresh index, unless we already tried within WINDOW_MS
 *  (loop guard). Returns true if a reload was scheduled. No-op on the server. */
export function reloadForStaleChunk(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const now = Date.now();
    if (now - Number(sessionStorage.getItem(KEY) ?? 0) <= WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false; // no reliable guard (e.g. storage disabled) → don't risk a loop
  }
  setTimeout(() => window.location.reload(), 0);
  return true;
}
