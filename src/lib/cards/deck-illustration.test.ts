import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { DECK_HUES } from "./card-meta";
import { DECK_ILLUSTRATIONS, deckIllustrationStyle, momentumIllustrationTop } from "./deck-illustration";
import type { ProfileTab } from "../../contexts/profile";

describe("approved deck engravings", () => {
  it("matches Momentum B's three approved positions and bounds the extremes", () => {
    expect(momentumIllustrationTop(20)).toBe(5);
    expect(momentumIllustrationTop(50)).toBe(-22.5);
    expect(momentumIllustrationTop(80)).toBe(-50);
    expect(momentumIllustrationTop(0)).toBe(5);
    expect(momentumIllustrationTop(99)).toBe(-50);
    expect(momentumIllustrationTop(-100)).toBe(5);
    expect(momentumIllustrationTop(150)).toBe(-50);
    for (let score = 0; score < 99; score++) {
      expect(momentumIllustrationTop(score + 1)).toBeLessThanOrEqual(momentumIllustrationTop(score));
    }
  });
  it("leaves scoreless boards, missing readings and other scenery static", () => {
    for (const score of [undefined, null, NaN, Infinity, -Infinity]) {
      expect(deckIllustrationStyle("momentum", score)["--deck-illustration-top"]).toBe("-5%");
    }
    for (const deck of Object.keys(DECK_ILLUSTRATIONS) as ProfileTab[]) {
      if (deck !== "momentum") expect(deckIllustrationStyle(deck, 99)).toEqual(deckIllustrationStyle(deck));
    }
    const { ["--deck-illustration-top"]: top, ...rest } = deckIllustrationStyle("momentum", 80);
    expect(top).toBe("-50%");
    const { ["--deck-illustration-top"]: _originalTop, ...original } = deckIllustrationStyle("momentum");
    expect(rest).toEqual(original);
  });
  it("uses Star Atlas for Meta and preserves Celestial Compass as a fallback", () => {
    const css = readFileSync("src/components/solid/EntityMeta.css", "utf8");
    expect(css).toContain('--meta-illustration-src: url("/deck-art/engraving-meta-star-atlas-v1.webp")');
    expect(existsSync("public/deck-art/engraving-meta-star-atlas-v1.webp")).toBe(true);
    expect(existsSync("public/deck-art/engraving-meta-celestial-compass-v1.webp")).toBe(true);
    expect(css).not.toContain("pw-ring-strokes");
  });

  it("covers every deck and shares the Scout's plate with Profile", () => {
    expect(Object.keys(DECK_ILLUSTRATIONS)).toEqual(Object.keys(DECK_HUES));
    expect(deckIllustrationStyle("profile")).toEqual(deckIllustrationStyle("scouting"));
  });

  it("keeps Sigil full and all other illustrations as edge fragments", () => {
    for (const deck of Object.keys(DECK_ILLUSTRATIONS) as ProfileTab[]) {
      const art = DECK_ILLUSTRATIONS[deck];
      expect(existsSync(`public/deck-art/engraving-${art.subject}-v1.webp`)).toBe(true);
      if (deck === "sigil") {
        expect(art).toEqual({ subject: "sigil", size: 100, left: 0, top: 0 });
      } else {
        expect(art.size).toBeGreaterThan(100);
        expect(art.left).toBeGreaterThan(0);
      }
    }
  });
});
