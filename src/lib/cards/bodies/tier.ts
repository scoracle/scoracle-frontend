import { TIER_HEX } from "./token-hex";

/**
 * tier — single source for the 5-tier antique-tarot percentile colors, as hex.
 *
 * resvg-on-Worker can't resolve CSS custom properties, so OG/share bodies read
 * token hex values through `token-hex`. Thresholds match the established OG
 * bodies (vibe / meta / pizza): 81 / 61 / 41 / 21.
 */

/** Map a 0-100 value (percentile or sentiment) to its tier hex. */
export function tierHex(value: number): string {
  if (value >= 81) return TIER_HEX.elite;
  if (value >= 61) return TIER_HEX.above;
  if (value >= 41) return TIER_HEX.average;
  if (value >= 21) return TIER_HEX.below;
  return TIER_HEX.poor;
}
