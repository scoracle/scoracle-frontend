import type { RatingTeam } from "./stats.server";
import { profilePath } from "../utils/profile-url";
import { query } from "@solidjs/router";
import { readSportMetaMaps, type SportMetaMaps } from "./entity-directory";
import { getPositionGroup } from "../utils/position-groups";
import { formatAgeFromDob, formatHeightForDisplay, formatWeightForDisplay } from "../utils/player-metrics";
import type { EntityType, PlayerMeta, TeamMeta } from "../types";
interface Detail {
    label: string;
    value: string;
}
export interface ResolvedMeta {
    name: string;
    subtitle: string;
    logoUrl: string;
    /** Player headshot only — empty when the sport ships no photo (NBA/NFL). */
    photoUrl: string;
    /** Team crest — the player's team crest, or the team's own logo. */
    teamLogoUrl: string;
    details: Detail[];
    position?: string;
    positionGroup?: string;
    raw: PlayerMeta | TeamMeta;
}
// ─── Detail builders ────────────────────────────────────────────────────────
function formatDraft(year?: number, round?: number, pick?: number): string | null {
    const parts: string[] = [];
    if (year)
        parts.push(String(year));
    if (round)
        parts.push(`R${round}`);
    if (pick)
        parts.push(`#${pick}`);
    return parts.length ? parts.join(" · ") : null;
}
function buildPlayerDetails(meta: PlayerMeta): Detail[] {
    const details: Detail[] = [];
    const position = meta.detailed_position || meta.position;
    if (position)
        details.push({ label: "Position", value: position });
    if (meta.jersey_number) {
        details.push({ label: "Number", value: `#${meta.jersey_number}` });
    }
    const height = formatHeightForDisplay(meta.height);
    if (height)
        details.push({ label: "Height", value: height });
    const weight = formatWeightForDisplay(meta.weight);
    if (weight)
        details.push({ label: "Weight", value: weight });
    // NFL ships a numeric age directly; Football derives it from DOB.
    const age = meta.age != null ? String(meta.age) : formatAgeFromDob(meta.date_of_birth);
    if (age)
        details.push({ label: "Age", value: age });
    const country = meta.birth_country || meta.nationality;
    if (country)
        details.push({ label: "Nationality", value: country });
    if (meta.college)
        details.push({ label: "College", value: meta.college });
    const draft = formatDraft(meta.draft_year, meta.draft_round, meta.draft_pick);
    if (draft)
        details.push({ label: "Draft", value: draft });
    if (meta.experience)
        details.push({ label: "Experience", value: meta.experience });
    if (meta.league?.name)
        details.push({ label: "League", value: meta.league.name });
    return details;
}
function buildTeamDetails(meta: TeamMeta, sport: string): Detail[] {
    const details: Detail[] = [];
    if (meta.league?.name)
        details.push({ label: "League", value: meta.league.name });
    // Country is redundant for single-nation leagues (NBA / NFL); kept for
    // Football where teams span multiple countries.
    const isAmericanLeague = sport.toUpperCase() === "NBA" || sport.toUpperCase() === "NFL";
    if (meta.country && !isAmericanLeague) {
        details.push({ label: "Country", value: meta.country });
    }
    if (meta.conference)
        details.push({ label: "Conference", value: meta.conference });
    if (meta.division)
        details.push({ label: "Division", value: meta.division });
    if (meta.founded)
        details.push({ label: "Founded", value: String(meta.founded) });
    if (meta.venue_name)
        details.push({ label: "Venue", value: meta.venue_name });
    if (meta.venue_capacity) {
        details.push({ label: "Capacity", value: meta.venue_capacity.toLocaleString() });
    }
    return details;
}
// ─── Data resolution ────────────────────────────────────────────────────────
function resolvePlayer(meta: PlayerMeta, sport: string, maps: SportMetaMaps): ResolvedMeta {
    const name = meta.name ||
        `${meta.first_name || ""} ${meta.last_name || ""}`.trim() ||
        "Unknown Player";
    const photoUrl = safePlayerPhotoUrl(sport, meta.photo_url);
    const teamLogoUrl = meta.team?.id != null ? maps.teams[String(meta.team.id)]?.logo_url || "" : "";
    return {
        name,
        subtitle: meta.team?.name || "",
        // No player photo? Fall back to the team crest (NBA and NFL have no
        // photo_url upstream, so this is the primary avatar path for those).
        logoUrl: photoUrl || teamLogoUrl,
        photoUrl,
        teamLogoUrl,
        details: buildPlayerDetails(meta),
        position: meta.position,
        positionGroup: getPositionGroup(sport, meta.position),
        raw: meta,
    };
}
// Provider URLs carry an unambiguous league namespace. Reject an impossible
// pairing at the display boundary so a stale or in-flight metadata write can
// never put a basketball player on an NFL profile (or vice versa).
function safePlayerPhotoUrl(sport: string, photoUrl?: string | null): string {
    const photo = photoUrl || "";
    const normalizedSport = sport.toUpperCase();
    const lower = photo.toLowerCase();
    if (normalizedSport === "NFL" && lower.includes("cdn.nba.com/headshots/nba/"))
        return "";
    if (normalizedSport === "NBA" && lower.includes("static.www.nfl.com/"))
        return "";
    return photo;
}
function resolveTeam(meta: TeamMeta, sport: string): ResolvedMeta {
    return {
        name: meta.name || "Unknown Team",
        subtitle: meta.city || "",
        logoUrl: meta.logo_url || "",
        photoUrl: "",
        teamLogoUrl: meta.logo_url || "",
        details: buildTeamDetails(meta, sport),
        raw: meta,
    };
}
// ─── Query ──────────────────────────────────────────────────────────────────
function resolveFromMaps(maps: SportMetaMaps, sport: string, type: EntityType, id: string): ResolvedMeta | null {
    if (type === "player") {
        const meta = maps.players[id];
        return meta ? resolvePlayer(meta, sport, maps) : null;
    }
    const meta = maps.teams[id];
    return meta ? resolveTeam(meta, sport) : null;
}
export function playerTeamFromRaw(resolved: ResolvedMeta): RatingTeam | null {
    const raw = resolved.raw as PlayerMeta;
    const team = raw.team;
    return team?.id != null
        ? {
            id: team.id,
            name: team.name,
            short_code: team.abbreviation ?? null,
            logo_url: team.logo_url ?? null,
        }
        : null;
}
export function teamHref(sport: string, teamId: number, teamName?: string | null): string {
    return profilePath(sport, "team", teamId, { name: teamName });
}
export function staticLogoUrl(resolved: ResolvedMeta, type: EntityType): string {
    if (type === "player") {
        return resolved.photoUrl || resolved.logoUrl;
    }
    return resolved.logoUrl;
}
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
/** Only team metadata crosses the server boundary for search and filters. */
export const getTeamMetadata = query(async (sport: string) => {
    "use server";
    return (await readSportMetaMaps(sport)).teams;
}, "entity-team-metadata");
