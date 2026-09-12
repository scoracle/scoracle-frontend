import { cardScoreColor } from "../utils/tier-color";
import { displayScore } from "./tarot-deck";
import type { EntityType } from "../types";
import type { CardId } from "./card-meta";

/** Follow each card's visible score meaning, not a second numeric scale.
 * Quiet/dormant busyness is clouded, healthy activity sunny, chaos lunar.
 * Momentum moves its existing plate instead; Sigil and bare vessels stay put. */
export function cardSky(card: CardId, score: number | null | undefined, type: EntityType) {
  if (!["profile", "scouting", "narratives", "transfers", "vibe"].includes(card)) return null;
  if (score == null || !Number.isFinite(score)) return null;
  const tier = cardScoreColor(card, displayScore(score), type);
  if (tier === "var(--percentile-elite)" || tier === "var(--percentile-above)") return "sun";
  if (tier === "var(--percentile-poor)" || tier === "var(--percentile-below)") return "moon";
  return "clouds";
}
