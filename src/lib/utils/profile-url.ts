/**
 * Profile URL helpers — the single source of truth for profile paths.
 *
 * Canonical shape (2026-07-18): `/profile/{sport}/{type}/{id}-{slug}` —
 * path-based so every entity is a distinct, indexable URL (the old
 * `/profile?sport=…&type=…&id=…` shape collapsed 15k+ profiles into one
 * query-param page, which read as a near-empty site to crawlers and ad
 * reviewers). The slug is display sugar only: routing keys on the leading
 * numeric id, so a stale or missing slug still resolves and the canonical
 * tag points at the slugged form.
 *
 * Secondary profile state (tab, season, scope, …) stays in query params —
 * only entity identity lives in the path.
 */

import { SPORTS, type EntityType } from "../types";

/** Lowercase, diacritic-free, dash-joined slug of a display name. */
export function slugifyName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isProfileSport(sport: string | undefined): boolean {
  if (!sport) return false;
  const lower = sport.toLowerCase();
  return SPORTS.some((s) => s.idLower === lower);
}

/** "123-lebron-james" | "123" → "123"; anything without a leading id → null. */
export function parseEntityIdParam(param: string | undefined): string | null {
  if (!param) return null;
  const match = /^(\d+)(?:-|$)/.exec(param);
  return match ? match[1] : null;
}

/** Build a profile path. Pass `name` when available for the SEO slug. */
export function profilePath(
  sport: string,
  type: string,
  id: string | number,
  opts?: { name?: string | null; tab?: string },
): string {
  const entityType: EntityType = type === "team" ? "team" : "player";
  const slug = slugifyName(opts?.name);
  const idSegment = slug ? `${id}-${slug}` : String(id);
  const base = `/profile/${sport.toLowerCase()}/${entityType}/${idSegment}`;
  return opts?.tab ? `${base}?tab=${opts.tab}` : base;
}

export interface ProfilePathParts {
  sport: string;
  type: EntityType;
  id: string;
}

/** Parse a pathname into profile parts, or null when it isn't an entity
 *  profile path (wrong shape, unknown sport, or no numeric id). */
export function parseProfilePath(pathname: string): ProfilePathParts | null {
  const match = /^\/profile\/([^/]+)\/(player|team)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const sport = match[1].toLowerCase();
  const id = parseEntityIdParam(match[3]);
  if (!isProfileSport(sport) || !id) return null;
  return { sport, type: match[2] as EntityType, id };
}
