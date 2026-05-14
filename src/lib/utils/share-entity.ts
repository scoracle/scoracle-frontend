/**
 * share-entity — sync entity meta lookup for share-frame headers.
 *
 * Pulls the same {name, imageUrl, context} that EntityMeta resolves
 * for the live MetaShell, so a share artifact's identification matches
 * the in-app entity card. Used by every Card that exposes share —
 * VibeCard for the primary entity, CompareCard for both primary and
 * the comparison-selected secondary entity.
 *
 * Returns null when the meta JSON for the sport hasn't loaded yet;
 * callers fall back to a generic "Scoracle" name + empty image. By
 * the time the user opens a share modal, profile.tsx's firePreloads
 * has long since warmed the meta cache.
 */

import { entityDataStore } from "./entity-data-store";

export interface ShareEntityFacts {
  name: string;
  imageUrl: string;
  context: string;
}

export function readShareEntity(
  sport: string,
  type: "player" | "team",
  id: string,
): ShareEntityFacts | null {
  if (type === "player") {
    const m = entityDataStore.getPlayerMetaSync(sport, id);
    if (!m) return null;
    const name = m.name || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Unknown";
    let imageUrl = m.photo_url || "";
    if (!imageUrl && m.team?.id != null) {
      const team = entityDataStore.getTeamMetaSync(sport, String(m.team.id));
      imageUrl = team?.logo_url || "";
    }
    const context = [m.team?.name, sport.toUpperCase()].filter(Boolean).join(" · ");
    return { name, imageUrl, context };
  }
  const t = entityDataStore.getTeamMetaSync(sport, id);
  if (!t) return null;
  return {
    name: t.name || "Unknown",
    imageUrl: t.logo_url || "",
    context: [t.city, sport.toUpperCase()].filter(Boolean).join(" · "),
  };
}
