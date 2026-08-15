/**
 * Story URL helpers — the storyline pages' path shape, mirroring the profile
 * convention: `/story/{sport}/{id}-{slug}`. The slug is display sugar only;
 * routing keys on the leading numeric id (parseEntityIdParam), so a stale or
 * missing slug still resolves. List state (sport, status) stays in query
 * params on /stories; only story identity lives in the path.
 */

import { slugifyName } from "./profile-url";

/** Build a story path. Pass `title` when available for the readable slug. */
export function storyPath(sport: string, id: string | number, title?: string | null): string {
  const slug = slugifyName(title);
  const idSegment = slug ? `${id}-${slug}` : String(id);
  return `/story/${sport.toLowerCase()}/${idSegment}`;
}

/** Build the stories list path for a sport. */
export function storiesPath(sport: string): string {
  return `/stories?${new URLSearchParams({ sport: sport.toUpperCase() }).toString()}`;
}
