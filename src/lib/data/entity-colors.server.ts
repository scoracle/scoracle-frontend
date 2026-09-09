import { query } from "@solidjs/router";
import { entityProductUrl } from "../utils/data-sources";
import { teamPalette, type TeamColorMeta, type TeamPalette } from "../utils/team-colors";
import { fetchJsonOrNull } from "./fetch-json.server";

async function fetchEntityColors(sport: string, type: string, id: string): Promise<TeamPalette | undefined> {
  "use server";
  if (!sport || !id) return undefined;
  // Decorative metadata must not make the reading unavailable during an API failure.
  const meta = await fetchJsonOrNull<TeamColorMeta>(entityProductUrl(sport, type, id, "meta"), "meta colors")
    .catch(() => null);
  return teamPalette(meta);
}

export const getEntityColors = query(fetchEntityColors, "entity-colors");
