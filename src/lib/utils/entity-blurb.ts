/**
 * Per-entity descriptive prose, generated from structured meta.
 *
 * Rendered as a human-visible paragraph in the (now SSR'd) EntityMeta card
 * and reused for the page's <meta name="description"> / og:description. This
 * gives every profile real, unique, original text content for crawlers —
 * generated from fields, so it scales to thousands of entities with zero
 * manual writing. It must stay human-visible (hidden text = cloaking).
 */

import { SPORTS, type EntityType, type PlayerMeta, type TeamMeta } from "../types";

function sportDisplay(sport: string): string {
  return SPORTS.find((s) => s.idLower === sport.toLowerCase())?.display ?? sport;
}

export interface BlurbInput {
  name: string;
  type: EntityType;
  sport: string;
  raw: PlayerMeta | TeamMeta;
}

export function buildEntityBlurb(input: BlurbInput): string {
  const sport = sportDisplay(input.sport);
  const name = input.name;

  if (input.type === "team") {
    const t = input.raw as TeamMeta;
    const league = t.league?.name;
    const parts: string[] = [
      league ? `${name} is a ${league} ${sport} team` : `${name} is a ${sport} team`,
    ];
    const place = [t.city, t.country].filter(Boolean).join(", ");
    if (place) parts.push(`based in ${place}`);
    if (t.founded) parts.push(`founded in ${t.founded}`);
    if (t.venue_name) {
      parts.push(
        t.venue_capacity
          ? `playing at ${t.venue_name} (capacity ${t.venue_capacity.toLocaleString()})`
          : `playing at ${t.venue_name}`,
      );
    }
    return `${parts.join(", ")}. Scoracle tracks ${name}'s live rating, vibe sentiment, news, and social trends.`;
  }

  const p = input.raw as PlayerMeta;
  const position = p.detailed_position || p.position;
  const team = p.team?.name;
  const league = p.league?.name;
  let lead = `${name} is a`;
  if (position) lead += ` ${position}`;
  lead += ` ${sport} player`;
  if (team) lead += ` for ${team}`;
  if (league) lead += ` in ${league}`;
  return `${lead}. Scoracle tracks ${name}'s live rating, vibe sentiment, stats, news, and trends.`;
}
