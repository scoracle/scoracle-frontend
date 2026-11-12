import { query } from "@solidjs/router";
import { readSportMetaMaps } from "./entity-directory";
import { getPositionGroup } from "../utils/position-groups";
import type { EntityType } from "../types";
import { resolveFromMaps, type ResolvedMeta } from "./entity-meta";
export { playerTeamFromRaw, teamHref, staticLogoUrl, type ResolvedMeta } from "./entity-meta";

export async function resolveEntityMeta(sport: string, type: EntityType, id: string): Promise<ResolvedMeta | null> {
    "use server";
    if (!sport || !id)
        return null;
    // Server: read the isolate-memoized maps DIRECTLY. Any query() that runs
    // during SSR serializes its full result into the hydration payload, so
    // going through getSportMetaMaps here shipped the entire sport map (3.1MB
    // of HTML for football) with every profile render. Only this ONE entity's
    // resolved meta may ride the createMemo serialization.
    // The browser calls this narrowed query through the server-function RPC;
    // metadata maps stay on the server for profile navigation.
    const maps = await readSportMetaMaps(sport).catch(() => null);
    return maps ? resolveFromMaps(maps, sport, type, id) : null;
}
export const getEntityMeta = query(resolveEntityMeta, "entity-meta");
/** Only the controls' prepared options cross the wire, never the player map. */
export const getBoardOptions = query(async (sport: string) => {
    "use server";
    const maps = await readSportMetaMaps(sport);
    return {
        teams: Object.values(maps.teams),
        positions: [...new Set(Object.values(maps.players)
            .map(player => getPositionGroup(sport, player.position)).filter((p): p is string => !!p))].sort(),
    };
}, "board-options");
/** Only team metadata crosses the server boundary for search and filters. */
export const getTeamMetadata = query(async (sport: string) => {
    "use server";
    return (await readSportMetaMaps(sport)).teams;
}, "entity-team-metadata");
