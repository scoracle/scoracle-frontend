/** One number per character; Profile is the Scout's second view, not a
 * seventh reading. Preserve deck order as available readings come and go. */
export const META_SCORE_DECKS = [
    "scouting", "narratives", "transfers", "vibe", "momentum", "sigil",
] as const;
export type MetaScoreDeck = typeof META_SCORE_DECKS[number];
export type MetaScores = Partial<Record<MetaScoreDeck, number | null | undefined>>;
