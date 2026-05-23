/**
 * categories — sport-aware human labels for share-text post copy.
 *
 * "Check out {entity}'s {category} report" — this module resolves
 * the {category} term from the {cardType, sport} pair so the copy
 * reads naturally per sport (set pieces vs. special teams vs.
 * dead ball).
 *
 * The chart slot labels in `~/lib/utils/stats-categorizer.ts` are
 * title-case nouns for chart titles ("Special Teams", "Set Pieces").
 * Share copy needs lowercase phrases that fit inside a sentence,
 * and uses "defensive" / "attacking" as adjectives where they read
 * more naturally than the chart-titled nouns ("Defense", "Attack").
 */

import type { ChartSlotId } from "../utils/stats-categorizer";

export type CardType =
  | "vibe"
  | `stats:${ChartSlotId}`
  | `compare:${ChartSlotId}`
  | "traits"
  | "trends";

type SportKey = "nba" | "nfl" | "football";

interface LabelSet {
  default: string;
  nba?: string;
  nfl?: string;
  football?: string;
}

const STATS_LABELS: Record<ChartSlotId, LabelSet> = {
  attack:     { default: "attacking" },
  possession: { default: "possession" },
  defense:    { default: "defensive" },
  discipline: { default: "discipline" },
  setpiece:   { default: "set pieces", nfl: "special teams", nba: "dead ball" },
};

/** Resolve the share-text category term for a given card type + sport. */
export function categoryFor(cardType: CardType, sport: string): string {
  if (cardType === "vibe") return "vibes";
  if (cardType === "traits") return "traits";
  if (cardType === "trends") return "trends";

  const [kind, slot] = cardType.split(":") as ["stats" | "compare", ChartSlotId];
  const labels = STATS_LABELS[slot];
  const sportKey = sport.toLowerCase() as SportKey;
  const base = labels[sportKey] ?? labels.default;
  return kind === "compare" ? `${base} comparison` : base;
}
