/**
 * entity-name — sync entity display-name lookup from the bundled meta
 * store.
 *
 * Resolves the same display name EntityMeta shows for the live
 * MetaShell, so the share post copy ("Check out {name}'s … report")
 * matches the in-app entity card. Reads the already-warmed
 * `entityDataStore` synchronously — by the time a user clicks share,
 * profile.tsx's `firePreloads` has long since loaded the sport's meta.
 *
 * Returns "" when the meta JSON for the sport hasn't loaded yet;
 * callers treat that as "no name" and let the OS share sheet / OG
 * crawler fall back to the page title.
 */

import { entityDataStore } from "./entity-data-store";

export function readEntityName(
  sport: string,
  type: "player" | "team",
  id: string,
): string {
  if (type === "player") {
    const m = entityDataStore.getPlayerMetaSync(sport, id);
    if (!m) return "";
    return m.name || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "";
  }
  const t = entityDataStore.getTeamMetaSync(sport, id);
  return t?.name || "";
}
