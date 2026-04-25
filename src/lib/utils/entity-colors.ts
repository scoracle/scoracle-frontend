/**
 * Resolve entity → color for comparison views.
 *
 * Teams map directly to their own token. Players inherit their team's
 * token via entityDataStore's preloaded meta.
 *
 * When two entities collide on primary color (e.g., Lakers player vs
 * Lakers player, or two teams with the same brand primary), the compare
 * entity falls back to its team's secondary so the chart stays legible.
 */

import { entityDataStore } from './entity-data-store';
import { getTeamColors, DEFAULT_ENTITY_COLORS, type TeamColorToken } from '../data/team-colors';
import type { EntityType } from '../types';

/**
 * Look up the team token for an entity. Returns null if the team is
 * unknown or if its colors haven't been seeded yet.
 */
export function resolveEntityColors(
  sport: string,
  type: EntityType,
  id: string,
): TeamColorToken | null {
  if (type === 'team') {
    return getTeamColors(sport, id);
  }
  // Player: walk through meta to find the team id
  const player = entityDataStore.getPlayerMetaSync(sport, id);
  const teamId = player?.team?.id;
  if (teamId === undefined) return null;
  return getTeamColors(sport, teamId);
}

/**
 * Resolve a primary + compare pair to the two hex strings the PizzaChart
 * consumes via `--compare-primary` / `--compare-secondary`.
 *
 * Collision rule: if both resolve to the same primary, the compare entity
 * switches to its team's secondary. Either side missing a token falls
 * back to the default palette so we never render black/transparent.
 */
export function resolveComparisonPalette(
  primary: { sport: string; type: EntityType; id: string },
  compare: { sport: string; type: EntityType; id: string },
): { primary: string; secondary: string } {
  const primaryToken = resolveEntityColors(primary.sport, primary.type, primary.id);
  const compareToken = resolveEntityColors(compare.sport, compare.type, compare.id);

  const primaryHex = primaryToken?.primary ?? DEFAULT_ENTITY_COLORS.primary;

  let compareHex: string;
  if (!compareToken) {
    compareHex = DEFAULT_ENTITY_COLORS.secondary;
  } else if (compareToken.primary.toLowerCase() === primaryHex.toLowerCase()) {
    // Same-team or same-primary collision — use the compare side's secondary.
    compareHex = compareToken.secondary;
  } else {
    compareHex = compareToken.primary;
  }

  return { primary: primaryHex, secondary: compareHex };
}
