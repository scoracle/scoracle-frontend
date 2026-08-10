/**
 * tarot-deck — the deck SSOT: six character decks, ten cards each.
 *
 * Every character card carries a character-assigned score (displayed 0-99);
 * the score's decile draws one card from that character's own ten-card set
 * (rank = tens digit). The NUMBER is magnitude; the CARD is judgment — the
 * cards chosen per rank carry the character's voice (a rank-9 Swords draw
 * reads as a media storm, not a triumph), which is how the busyness lenses
 * say "the sweet spot is the middle" without bending the scale.
 *
 * Deck assignment (Scott, 2026-07-23):
 *   Wands → The Scout        Swords → The Journalist   Pentacles → The Insider
 *   Cups  → The Influencer   court ladder → The Analyst   majors → the Oracle
 *
 * Pip decks map Ace-Ten onto ranks 0-9 in suit order; the names are the
 * curation surface (Scott may re-voice individual ranks — edit the tables,
 * nothing else moves). The Oracle's deck is the decile rebanding of the old
 * eleven-band archetype table (The Devil retired; art slugs carried over).
 *
 * Like card-meta: pure data, ZERO component imports, safe on both sides of
 * SSR. Consumers: <Card> (corner numerals + score slot), SigilCard (art +
 * subtext), EmptyCard/leaderboard (the Veil).
 *
 * Source-of-truth doc: scoracle-wiki/wiki/Architecture/Vibe Score Surface.md
 */
import type { ProfileTab } from "../../contexts/profile";
import type { CardId } from "./card-meta";

export interface TarotCard {
  /** Decile rank 0-9 within the character's deck (VEIL_CARD alone is -1). */
  rank: number;
  /** Display name, e.g. "Seven of Swords", "The World". */
  name: string;
  /** Roman numeral as it appears on a traditional tarot card — the corner index. */
  numeral: string;
  /** Deck family the card is drawn from. */
  suit: "wands" | "swords" | "pentacles" | "cups" | "court" | "major";
  /** Asset filename slug (/vibe-art/*.svg) — Oracle majors + the Veil only. */
  slug?: string;
  /** Short italic subtext — Oracle majors + the Veil only. */
  vibe?: string;
}

const PIP_NAMES = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
] as const;
const PIP_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

function pipDeck(
  suit: "wands" | "swords" | "pentacles" | "cups",
  suitName: string,
): readonly TarotCard[] {
  return PIP_NAMES.map((pip, rank) => ({
    rank,
    name: `${pip} of ${suitName}`,
    numeral: PIP_NUMERALS[rank],
    suit,
  }));
}

export const TAROT_DECKS: Record<ProfileTab, readonly TarotCard[]> = {
  scouting: pipDeck("wands", "Wands"),
  narratives: pipDeck("swords", "Swords"),
  transfers: pipDeck("pentacles", "Pentacles"),
  vibe: pipDeck("cups", "Cups"),

  /* The Analyst climbs the court: trajectory as rank, Page to King. Numerals
     are the courts' traditional deck positions (Page XI, Knight XII, Queen
     XIII, King XIV) — they repeat across ranks; the name caption in the
     score slot disambiguates. */
  momentum: [
    { rank: 0, name: "Page of Pentacles",  numeral: "XI",  suit: "court" },
    { rank: 1, name: "Page of Swords",     numeral: "XI",  suit: "court" },
    { rank: 2, name: "Page of Wands",      numeral: "XI",  suit: "court" },
    { rank: 3, name: "Knight of Pentacles", numeral: "XII", suit: "court" },
    { rank: 4, name: "Knight of Cups",     numeral: "XII", suit: "court" },
    { rank: 5, name: "Knight of Swords",   numeral: "XII", suit: "court" },
    { rank: 6, name: "Knight of Wands",    numeral: "XII", suit: "court" },
    { rank: 7, name: "Queen of Wands",     numeral: "XIII", suit: "court" },
    { rank: 8, name: "King of Swords",     numeral: "XIV", suit: "court" },
    { rank: 9, name: "King of Wands",      numeral: "XIV", suit: "court" },
  ],

  /* The Oracle's majors — decile rebanding of the retired eleven-band
     archetype table. Slugs and subtexts carried over so /vibe-art keeps
     working (the-devil.svg stays on disk, undrawn). */
  sigil: [
    { rank: 0, name: "Death",        numeral: "XIII",  suit: "major", slug: "death",        vibe: "ending, transformation" },
    { rank: 1, name: "The Tower",    numeral: "XVI",   suit: "major", slug: "the-tower",    vibe: "disrupted, collapsing" },
    { rank: 2, name: "The Moon",     numeral: "XVIII", suit: "major", slug: "the-moon",     vibe: "uncertain, shadowed" },
    { rank: 3, name: "The Hermit",   numeral: "IX",    suit: "major", slug: "the-hermit",   vibe: "quiet, withdrawn" },
    { rank: 4, name: "Temperance",   numeral: "XIV",   suit: "major", slug: "temperance",   vibe: "balanced, steady" },
    { rank: 5, name: "The Magician", numeral: "I",     suit: "major", slug: "the-magician", vibe: "capable, focused" },
    { rank: 6, name: "Strength",     numeral: "VIII",  suit: "major", slug: "strength",     vibe: "confident, in control" },
    { rank: 7, name: "The Star",     numeral: "XVII",  suit: "major", slug: "the-star",     vibe: "hopeful, well-regarded" },
    { rank: 8, name: "The Sun",      numeral: "XIX",   suit: "major", slug: "the-sun",      vibe: "radiant, ascending" },
    { rank: 9, name: "The World",    numeral: "XXI",   suit: "major", slug: "the-world",    vibe: "completion, peak alignment" },
  ],
};

/**
 * The Veil — the null state of every deck: drawn but unread. Not a rank; no
 * score maps to it (sentinel rank -1). Its numeral is the Fool's 0, which is
 * exactly what an unread card is. Cards with no score render corner DOTS
 * (the vessel's no-label fallback), not the Veil numeral; the Veil surfaces in
 * EmptyCard bodies and the score slot's unserved state.
 */
export const VEIL_CARD: TarotCard = {
  rank: -1,
  name: "The Veil",
  numeral: "0",
  suit: "major",
  slug: "the-veil",
  vibe: "drawn but unread",
};

/** Clamp a raw character/product score onto the 0-99 display scale. */
export function displayScore(raw: number): number {
  return Math.min(99, Math.max(0, Math.round(raw)));
}

/** Decile rank 0-9 for a display score (94 → 9, 2 → 0). */
export function rankForScore(score: number): number {
  return Math.min(9, Math.max(0, Math.floor(score / 10)));
}

/**
 * Draw a character's card for a score. Null for no score (non-finite or
 * null/undefined — the caller renders the Veil/dots null state) and for ids
 * without a deck (the standalone "leaderboard" identity).
 */
export function drawCard(cardId: CardId, score: number | null | undefined): TarotCard | null {
  if (score == null || !Number.isFinite(score)) return null;
  const deck = (TAROT_DECKS as Partial<Record<CardId, readonly TarotCard[]>>)[cardId];
  if (!deck) return null;
  return deck[rankForScore(displayScore(score))];
}
