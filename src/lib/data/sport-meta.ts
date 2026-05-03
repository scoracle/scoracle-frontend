/**
 * Sport meta query — bundled-JSON load for a single sport.
 *
 * Wraps `entityDataStore.loadMeta(sport)` in `query()` so consumers
 * (VibesTab and any future caller) see the same `createAsync + query()`
 * shape used elsewhere on the site. Client-only — gates on `!isServer`
 * so SSR doesn't try to fetch bundled JSON via a relative URL.
 *
 * The route's `firePreloads` calls this on profile mount, so by the
 * time any tab needing sport-meta activates, the cache is warm.
 */

import { query } from "@solidjs/router";
import { isServer } from "solid-js/web";
import { entityDataStore } from "../utils/entity-data-store";

async function ensureSportMeta(sport: string): Promise<true | null> {
  if (isServer || !sport) return null;
  await entityDataStore.loadMeta(sport).catch(() => {});
  return true;
}

export const getSportMeta = query(ensureSportMeta, "sport-meta");
