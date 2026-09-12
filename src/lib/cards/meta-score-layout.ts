import { displayScore } from "./tarot-deck";

/** One number per character; Profile is the Scout's second view, not a
 * seventh reading. Preserve deck order as available readings come and go. */
export const META_SCORE_DECKS = [
  "scouting", "narratives", "transfers", "vibe", "momentum", "sigil",
] as const;
export type MetaScoreDeck = typeof META_SCORE_DECKS[number];
export type MetaScores = Partial<Record<MetaScoreDeck, number | null | undefined>>;

export function metaScoreLayout(scores: MetaScores) {
  const available = META_SCORE_DECKS.filter(deck => {
    const value = scores[deck];
    return value != null && Number.isFinite(value);
  });
  return available.map((deck, index) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / available.length;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    return {
      deck,
      value: displayScore(scores[deck]!),
      x: 50 + 35 * dx,
      y: 50 + 35 * dy,
    };
  });
}
