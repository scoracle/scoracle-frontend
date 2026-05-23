/**
 * tier-color — 5-step antique-tarot palette mapping for percentile-like numbers.
 *
 * Single source of truth so VibeCard, TrendsCard, and any future surface that
 * shows a 1-100 score or a signed delta paint numbers the exact same color.
 * Tokens come from @scoracle/tokens (src/themes/light.json → --percentile-*).
 *
 * Two entry points:
 *   - tierColor(score)        — for raw 1-100 sentiment-style values.
 *   - tierColorFromDelta(d,…) — for signed deltas vs. a cohort baseline.
 *
 * For SVG-context (where CSS variables don't resolve), VibeCard.tsx keeps its
 * own TIER_HEX table mirroring these thresholds for the OG artifact renderer.
 */

export function tierColor(score: number): string {
  if (score >= 81) return "var(--percentile-elite)";
  if (score >= 61) return "var(--percentile-above)";
  if (score >= 41) return "var(--percentile-average)";
  if (score >= 21) return "var(--percentile-below)";
  return "var(--percentile-poor)";
}

/**
 * Map a signed delta (entity_recent / cohort - 1) onto the same 5-tier palette.
 *
 *   d ≥ +30%  → elite     (well above cohort)
 *   d ≥ +10%  → above
 *   |d| < 10% → average   (essentially tracking cohort)
 *   d ≤ -10%  → below
 *   d ≤ -30%  → poor      (well below cohort)
 *
 * Pass `inverted: true` for stats where lower-is-better (turnovers, fouls);
 * the sign is flipped before tiering so "fewer turnovers than cohort" reads green.
 */
export function tierColorFromDelta(delta: number, inverted = false): string {
  const d = inverted ? -delta : delta;
  if (d >= 0.30) return "var(--percentile-elite)";
  if (d >= 0.10) return "var(--percentile-above)";
  if (d >= -0.10) return "var(--percentile-average)";
  if (d >= -0.30) return "var(--percentile-below)";
  return "var(--percentile-poor)";
}

/**
 * Stat keys where lower values are better. Used by TrendsCard to flip the
 * delta sign before color-tiering so "fewer turnovers" → elite, not poor.
 *
 * Known limitation: position-ambiguous keys aren't here. `passing_interceptions`
 * (QB, bad) IS in the set; raw `interceptions` (football defender, good) is NOT —
 * the keys are distinct so per-position context is implicit. Plain stats like
 * `defensive_interceptions` are good for everyone who accrues them.
 */
export const LOWER_IS_BETTER = new Set<string>([
  "turnover", "turnovers",
  "fumbles_lost",
  "yellow_cards", "red_cards", "fouls_committed",
  "passing_interceptions",
]);
