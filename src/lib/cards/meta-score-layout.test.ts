import { describe, expect, it } from "vitest";
import { META_SCORE_DECKS, metaScoreLayout, type MetaScores } from "./meta-score-layout";

describe("meta score layout", () => {
  it("omits null, undefined and non-finite readings, but keeps zero", () => {
    expect(metaScoreLayout({ scouting: null, narratives: undefined, transfers: 0,
      vibe: NaN, momentum: Infinity, sigil: 55 }).map(s => [s.deck, s.value]))
      .toEqual([["transfers", 0], ["sigil", 55]]);
  });
  it("handles every count from zero through six with equal angular spacing", () => {
    for (let count = 0; count <= 6; count++) {
      const scores: MetaScores = Object.fromEntries(META_SCORE_DECKS.slice(0, count).map(d => [d, 50]));
      const slots = metaScoreLayout(scores);
      expect(slots).toHaveLength(count);
      for (let i = 0; i < count; i++) {
        const slot = slots[i];
        expect(Math.hypot(slot.x - 50, slot.y - 50)).toBeCloseTo(35);
        expect(slot.x).toBeCloseTo(50 + 35 * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / count));
        expect(slot.y).toBeCloseTo(50 + 35 * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / count));
      }
    }
  });
  it("reflows surviving values in deck order when one disappears", () => {
    const slots = metaScoreLayout({ scouting: 76, narratives: null, vibe: 61, sigil: 80 });
    expect(slots.map(s => s.deck)).toEqual(["scouting", "vibe", "sigil"]);
    expect(slots[0].x).toBeCloseTo(50);
    expect(slots[0].y).toBeCloseTo(15);
    expect(slots[1].y).toBeCloseTo(slots[2].y);
  });
});
