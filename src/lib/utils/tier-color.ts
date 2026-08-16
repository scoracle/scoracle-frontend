/**
 * tier-color — 5-step antique-tarot palette mapping for percentile-like numbers.
 *
 * Single source of truth so SigilCard, MomentumCard, and any future surface that
 * shows a 1-100 score or a signed delta paint numbers the exact same color.
 * Tokens come from @scoracle/tokens (src/themes/light.json → --percentile-*).
 *
 * One entry point: tierColor(score) for raw 1-100 sentiment-style values,
 * plus the magnitude-scoring variant tierColorScore and the busyness /
 * card-score dispatchers below.
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
 * Map a BUSYNESS score (0-99 news/transfer activity) onto a non-monotonic
 * scale (Scott, 2026-07-23): blue when the wire is quiet (apathy), green in
 * the controlled-action sweet spot, red when it's chaos. Used by the two
 * busyness lenses only (Narratives/The Journalist, Transfers/The Insider).
 *
 * The --busyness-* tokens ship in @scoracle/tokens ≥0.11 (theme-invariant,
 * like the percentile set — cardstock never themes); the hexes remain as
 * fallbacks for token-less render contexts.
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
