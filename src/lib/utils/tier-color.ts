/**
 * tier-color — 5-step antique-tarot palette mapping for percentile-like numbers.
 *
 * Single source of truth so SigilCard, MomentumCard, and any future surface that
 * shows a 1-100 score or a signed delta paint numbers the exact same color.
 * Tokens come from @scoracle/tokens (src/themes/light.json → --percentile-*).
 *
 * Two entry points:
 *   - tierColor(score)        — for raw 1-100 sentiment-style values.
 *   - tierColorFromDelta(d,…) — for signed deltas vs. a cohort baseline.
 *
 * For SVG-context (where CSS variables don't resolve), SigilCard.tsx keeps its
 * own TIER_HEX table mirroring these thresholds for the OG artifact renderer.
 */
import type { CardId } from "../cards/card-meta";
import type { EntityType } from "../types";

export function tierColor(score: number): string {
  if (score >= 81) return "var(--percentile-elite)";
  if (score >= 61) return "var(--percentile-above)";
  if (score >= 41) return "var(--percentile-average)";
  if (score >= 21) return "var(--percentile-below)";
  return "var(--percentile-poor)";
}

/**
 * Map a magnitude SCORE (0-100, mean 50, SD 10) onto the same 5-tier palette.
 * Unlike `tierColor` (percentile thresholds), this tiers by standard deviations
 * from the average: each band is ~1 SD wide.
 *
 *   ≥ 65  → elite     (+1.5 SD and up)
 *   ≥ 55  → above      (+0.5 SD)
 *   ≥ 45  → average    (within ±0.5 SD)
 *   ≥ 35  → below      (-0.5 SD)
 *   < 35  → poor       (-1.5 SD and down)
 */
export function tierColorScore(score: number): string {
  if (score >= 65) return "var(--percentile-elite)";
  if (score >= 55) return "var(--percentile-above)";
  if (score >= 45) return "var(--percentile-average)";
  if (score >= 35) return "var(--percentile-below)";
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
 * Map a BUSYNESS score (0-99 news/transfer activity) onto a non-monotonic
 * scale (Scott, 2026-07-23): blue when the wire is quiet (apathy), green in
 * the controlled-action sweet spot, red when it's chaos. Used by the two
 * busyness lenses only (Narratives/The Journalist, Transfers/The Insider).
 *
 * The --busyness-* tokens ship in @scoracle/tokens ≥0.11; the hex fallbacks
 * carry the scale until then (antique-palette blues, light-theme tuned).
 */
export function tierColorBusyness(score: number): string {
  if (score >= 85) return "var(--percentile-poor)";
  if (score >= 70) return "var(--percentile-below)";
  if (score >= 40) return "var(--percentile-elite)";
  if (score >= 15) return "var(--busyness-quiet, #6f93ae)";
  return "var(--busyness-dormant, #56789a)";
}

/**
 * The one dispatch for a character card's display score (0-99): each card's
 * color scale in a single place so the score slot, and any future surface
 * that paints a card score, agree.
 *
 *   scouting              — magnitude for players, percentile for teams
 *   narratives, transfers — the non-monotonic busyness scale
 *   everything else       — percentile-style 1-100 reads
 */
export function cardScoreColor(cardId: CardId, score: number, type: EntityType): string {
  switch (cardId) {
    case "narratives":
    case "transfers":
      return tierColorBusyness(score);
    case "scouting":
      return type === "team" ? tierColor(score) : tierColorScore(score);
    default:
      return tierColor(score);
  }
}

/**
 * Stat keys where lower values are better. Used by MomentumCard to flip the
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
  "injuries",
]);
