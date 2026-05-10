/**
 * Reversal mechanic — frontend-cached previous score.
 *
 * VibeCard renders the archetype illustration upside-down ("reversed") when
 * the score has dropped meaningfully since the user's last viewing. The
 * "last viewing" state lives in localStorage rather than in a backend
 * payload — simpler shipping, and arguably more meaningful product
 * (reversal is relative to the user's last visit, not the prior cron run).
 *
 * On a fresh render of a VibeCard:
 *   1. Read the cached previous score for this entity (if any).
 *   2. Compare against the new score using the configured drop threshold.
 *   3. Update the cache with the new score.
 *
 * SSR-safe: storage reads/writes are no-ops on the server (returning a
 * "no reversal" verdict). Reversal only ever lights up client-side, after
 * hydration.
 */

/** Score must drop by at least this many points to count as a reversal. */
export const REVERSAL_THRESHOLD = 4;

const CACHE_PREFIX = "scoracle:vibe:";

interface CachedScore {
  score: number;
  cachedAt: string; // ISO timestamp
}

export interface VibeKey {
  sport: string;
  type: string;
  id: string | number;
}

function cacheKey(k: VibeKey): string {
  return `${CACHE_PREFIX}${k.sport}:${k.type}:${k.id}`;
}

/**
 * Runtime feature detection — handles SSR (no window), Safari private mode
 * (window.localStorage access throws), and test environments where
 * localStorage may be missing or incomplete.
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = window.localStorage;
    if (!ls || typeof ls.getItem !== "function" || typeof ls.setItem !== "function") {
      return null;
    }
    return ls;
  } catch {
    return null;
  }
}

/**
 * Read the user's last-seen score for this entity from localStorage.
 * Returns null on server, on first viewing, or on any read/parse failure
 * (cache is best-effort — it never throws upstream).
 */
export function readPreviousScore(k: VibeKey): number | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(cacheKey(k));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedScore;
    return typeof parsed.score === "number" && Number.isFinite(parsed.score)
      ? parsed.score
      : null;
  } catch {
    return null;
  }
}

/**
 * Persist the just-fetched score so the next visit can compare against it.
 * Best-effort — silent on quota/storage failures.
 */
export function writeCurrentScore(k: VibeKey, score: number): void {
  const storage = getStorage();
  if (!storage) return;
  if (!Number.isFinite(score)) return;
  try {
    const payload: CachedScore = {
      score,
      cachedAt: new Date().toISOString(),
    };
    storage.setItem(cacheKey(k), JSON.stringify(payload));
  } catch {
    // Storage full / disabled — reversal silently won't fire next time.
  }
}

/**
 * Reversal verdict: true when the score has dropped by at least the
 * threshold since the user's last viewing. False on first viewing, on
 * upward movement, or on small (<threshold) downward movement.
 */
export function isReversed(current: number, previous: number | null): boolean {
  if (previous == null) return false;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return false;
  return previous - current >= REVERSAL_THRESHOLD;
}

/**
 * Convenience: read the cached previous, compute the reversal verdict
 * against the current score, and write the new score back. Returns the
 * full picture for the renderer.
 */
export function evaluateReversal(
  k: VibeKey,
  currentScore: number
): { reversed: boolean; previousScore: number | null } {
  const previousScore = readPreviousScore(k);
  const reversed = isReversed(currentScore, previousScore);
  writeCurrentScore(k, currentScore);
  return { reversed, previousScore };
}
