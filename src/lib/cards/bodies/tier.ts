/**
 * tier — single source for the 5-tier antique-tarot percentile colors, as hex.
 *
 * resvg-on-Worker can't resolve the `--percentile-*` CSS custom properties, so
 * every OG/share body uses these hex literals (the in-app charts use the CSS
 * vars via `lib/charts/arc-math`). Thresholds match the established OG bodies
 * (vibe / meta / pizza): 81 / 61 / 41 / 21. Mirrors `@scoracle/tokens`.
 */
export const TIER_HEX = {
  elite:   "#7a9b76",
  above:   "#6b8fc7",
  average: "#c9a04a",
  below:   "#c47a5d",
  poor:    "#a85252",
} as const;

/** Map a 0-100 value (percentile or sentiment) to its tier hex. */
export function tierHex(value: number): string {
  if (value >= 81) return TIER_HEX.elite;
  if (value >= 61) return TIER_HEX.above;
  if (value >= 41) return TIER_HEX.average;
  if (value >= 21) return TIER_HEX.below;
  return TIER_HEX.poor;
}
