import { describe, it, expect } from "vitest";
import {
  TAROT_DECKS,
  VEIL_CARD,
  displayScore,
  rankForScore,
  drawCard,
  type TarotCard,
} from "./tarot-deck";

const DECK_IDS = Object.keys(TAROT_DECKS) as Array<keyof typeof TAROT_DECKS>;

describe("TAROT_DECKS", () => {
  it("has all six character decks", () => {
    expect(DECK_IDS.sort()).toEqual(
      ["momentum", "narratives", "scouting", "sigil", "transfers", "vibe"].sort(),
    );
  });

  it("every deck holds exactly ten cards ranked 0-9 in order", () => {
    for (const id of DECK_IDS) {
      const deck = TAROT_DECKS[id];
      expect(deck).toHaveLength(10);
      deck.forEach((card, i) => expect(card.rank).toBe(i));
    }
  });

  it("every card carries a name and a numeral", () => {
    for (const id of DECK_IDS) {
      for (const card of TAROT_DECKS[id]) {
        expect(card.name.length).toBeGreaterThan(0);
        expect(card.numeral.length).toBeGreaterThan(0);
      }
    }
  });

  it("no card is drawn by two characters (60 distinct cards)", () => {
    const names = DECK_IDS.flatMap((id) => TAROT_DECKS[id].map((c) => c.name));
    expect(new Set(names).size).toBe(60);
  });

  it("the Oracle's majors all carry art slugs and subtexts", () => {
    for (const card of TAROT_DECKS.sigil) {
      expect(card.suit).toBe("major");
      expect(card.slug).toBeTruthy();
      expect(card.vibe).toBeTruthy();
    }
  });

  it("pip decks map suits per the locked assignment", () => {
    const suitOf = (deck: readonly TarotCard[]) => new Set(deck.map((c) => c.suit));
    expect(suitOf(TAROT_DECKS.scouting)).toEqual(new Set(["wands"]));
    expect(suitOf(TAROT_DECKS.narratives)).toEqual(new Set(["swords"]));
    expect(suitOf(TAROT_DECKS.transfers)).toEqual(new Set(["pentacles"]));
    expect(suitOf(TAROT_DECKS.vibe)).toEqual(new Set(["cups"]));
    expect(suitOf(TAROT_DECKS.momentum)).toEqual(new Set(["court"]));
  });
});

describe("displayScore", () => {
  it("rounds and clamps onto 0-99", () => {
    expect(displayScore(54.4)).toBe(54);
    expect(displayScore(54.5)).toBe(55);
    expect(displayScore(-5)).toBe(0);
    expect(displayScore(0)).toBe(0);
    expect(displayScore(99)).toBe(99);
    expect(displayScore(100)).toBe(99);
    expect(displayScore(120)).toBe(99);
  });
});

describe("rankForScore", () => {
  it("takes the tens digit, capped at 9", () => {
    expect(rankForScore(0)).toBe(0);
    expect(rankForScore(2)).toBe(0);
    expect(rankForScore(9)).toBe(0);
    expect(rankForScore(10)).toBe(1);
    expect(rankForScore(55)).toBe(5);
    expect(rankForScore(94)).toBe(9);
    expect(rankForScore(99)).toBe(9);
  });
});

describe("drawCard", () => {
  it("draws by decile from the character's own deck", () => {
    expect(drawCard("sigil", 95)?.name).toBe("The World");
    expect(drawCard("sigil", 4)?.name).toBe("Death");
    expect(drawCard("sigil", 62)?.name).toBe("Strength");
    expect(drawCard("narratives", 94)?.name).toBe("Ten of Swords");
    expect(drawCard("scouting", 2)?.name).toBe("Ace of Wands");
    expect(drawCard("momentum", 99)?.name).toBe("King of Wands");
  });

  it("clamps out-of-range raw scores instead of missing", () => {
    expect(drawCard("sigil", 100)?.name).toBe("The World");
    expect(drawCard("vibe", -3)?.name).toBe("Ace of Cups");
  });

  it("returns null for no score", () => {
    expect(drawCard("sigil", null)).toBeNull();
    expect(drawCard("sigil", undefined)).toBeNull();
    expect(drawCard("sigil", NaN)).toBeNull();
    expect(drawCard("sigil", Infinity)).toBeNull();
  });

  it("returns null for identities without a deck", () => {
    expect(drawCard("leaderboard", 50)).toBeNull();
  });
});

describe("VEIL_CARD", () => {
  it("keeps the Veil identity for null-state consumers", () => {
    expect(VEIL_CARD.slug).toBe("the-veil");
    expect(VEIL_CARD.numeral).toBe("0");
    expect(VEIL_CARD.name).toBe("The Veil");
  });

  it("is not part of any deck and cannot be drawn", () => {
    expect(VEIL_CARD.rank).toBe(-1);
    for (const id of DECK_IDS) {
      expect(TAROT_DECKS[id]).not.toContain(VEIL_CARD);
    }
  });
});
