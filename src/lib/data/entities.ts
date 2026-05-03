/**
 * Sport entity directory query — bundled-JSON load.
 *
 * Wraps `loadEntitiesForSport(sport)` in `query()` so consumers
 * (CoMentionsTab and any future caller) see the same `createAsync +
 * query()` shape used elsewhere. Client-only — gates on `!isServer`
 * so SSR doesn't try to fetch bundled JSON via a relative URL.
 *
 * The route's `firePreloads` calls this on profile mount, so by the
 * time CoMentionsTab activates, the entity directory is warm.
 */

import { query } from "@solidjs/router";
import { isServer } from "solid-js/web";
import { loadEntitiesForSport, type Entity } from "../utils/co-mentions";

async function fetchEntities(sport: string): Promise<Entity[] | null> {
  if (isServer || !sport) return null;
  return loadEntitiesForSport(sport);
}

export const getEntities = query(fetchEntities, "entities");
