/**
 * Server-side entity-facts fetcher for the OG image route.
 *
 * Mirrors `src/lib/utils/share-entity.ts`'s `readShareEntity` but
 * resolved server-side — the client-side `entityDataStore` (bundled
 * JSON) isn't available to the Worker, so we hit the Go API directly.
 * Returns the same `{name, imageUrl, context}` shape so the OG header
 * band matches what the legacy in-app share modal renders.
 */

import { query } from "@solidjs/router";
import { entityUrl, unwrapEntityPayload } from "../utils/data-sources";

export interface OgEntityFacts {
  name: string;
  imageUrl: string;
  context: string;
}

// The Go API returns a sport-specific entity record; we only pluck the
// few fields we care about for OG. Defensive on every field — backend
// schemas can drift.
interface RawEntity {
  name?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  logo_url?: string;
  city?: string;
  team?: { name?: string };
}

async function fetchOgEntityFactsImpl(
  sport: string,
  type: string,
  id: string,
): Promise<OgEntityFacts | null> {
  "use server";
  if (!sport || !type || !id) return null;
  const { url, headers } = entityUrl(sport, type, id);
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const payload = await res.json();
  const entity = unwrapEntityPayload<RawEntity>(payload);
  if (!entity) return null;

  const sportUpper = sport.toUpperCase();
  if (type === "team") {
    return {
      name: entity.name ?? "Unknown",
      imageUrl: entity.logo_url ?? "",
      context: [entity.city, sportUpper].filter(Boolean).join(" · "),
    };
  }

  // player
  const composedName =
    entity.name ||
    `${entity.first_name ?? ""} ${entity.last_name ?? ""}`.trim() ||
    "Unknown";
  return {
    name: composedName,
    imageUrl: entity.photo_url ?? "",
    context: [entity.team?.name, sportUpper].filter(Boolean).join(" · "),
  };
}

export const getOgEntityFacts = query(fetchOgEntityFactsImpl, "og-entity-facts");
