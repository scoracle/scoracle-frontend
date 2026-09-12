import { cardScoreColor } from "../utils/tier-color";
import { displayScore } from "./tarot-deck";
import type { EntityType } from "../types";

/** Follow Profile's visible score bands. Null has no sky. */
export function profileSky(score: number | null | undefined, type: EntityType) {
  if (score == null || !Number.isFinite(score)) return null;
  const tier = cardScoreColor("profile", displayScore(score), type);
  if (tier === "var(--percentile-elite)" || tier === "var(--percentile-above)") return "sun";
  if (tier === "var(--percentile-average)") return "clouds";
  return "moon";
}
