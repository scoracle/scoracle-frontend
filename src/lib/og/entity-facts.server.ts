/**
 * Server-side entity-facts fetcher for the share-card OG route.
 *
 * Resolves the {name, imageUrl, subtitle} triplet rendered in the
 * top-left (and top-right, for compare) header block of the vertical
 * share card. This is the OG renderer's own entity lookup — it hits the
 * Go API directly because the bundled-JSON client-side store
 * (`entity-name.ts`) isn't available to Workers.
 *
 * Subtitle convention:
 *   - player → "{position} · {team}"  (e.g., "SF · Lakers")
 *   - team   → "{conference}" if present, else "{city} · {SPORT}"
 *
 * Sport is left off the player subtitle because the team name already
 * implies it; for teams without a conference, the sport context is
 * useful to disambiguate generic city names.
 */

import { query } from "@solidjs/router";
import { entityUrl, unwrapEntityPayload } from "../utils/data-sources";

export interface OgEntityFacts {
  name: string;
  imageUrl: string;
  subtitle: string;
}

interface RawEntity {
  name?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  logo_url?: string;
  city?: string;
  position?: string;
  conference?: string;
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
    const subtitle =
      entity.conference?.trim() ||
      [entity.city, sportUpper].filter(Boolean).join(" · ");
    return {
      name: entity.name ?? "Unknown",
      imageUrl: entity.logo_url ?? "",
      subtitle,
    };
  }

  // player
  const composedName =
    entity.name ||
    `${entity.first_name ?? ""} ${entity.last_name ?? ""}`.trim() ||
    "Unknown";
  const subtitle = [entity.position, entity.team?.name]
    .filter(Boolean)
    .join(" · ");
  return {
    name: composedName,
    imageUrl: entity.photo_url ?? "",
    subtitle,
  };
}

export const getOgEntityFacts = query(fetchOgEntityFactsImpl, "og-entity-facts");
