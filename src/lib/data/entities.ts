/**
 * Sport entity directory query — bundled-JSON load.
 *
 * Wraps `loadEntitiesForSport(sport)` in `query()` so consumers see the
 * same `createAsync + query()` shape used elsewhere. Client-only —
 * gates on `!isServer` so SSR doesn't try to fetch bundled JSON via a
 * relative URL.
 *
 * If a route-level warm pass calls this after hydration, the entity directory
 * is warm by the time a client enhancement reads it.
 */

import { query } from "@solidjs/router";
import { isServer } from "solid-js/web";
import { loadEntitiesForSport, type Entity } from "../utils/co-mentions";

async function fetchEntities(sport: string): Promise<Entity[] | null> {
  if (isServer || !sport) return null;
  return loadEntitiesForSport(sport);
}

export const getEntities = query(fetchEntities, "entities");
