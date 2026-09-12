import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { DECK_HUES } from "./card-meta";
import { DECK_ILLUSTRATIONS, deckIllustrationStyle } from "./deck-illustration";
import type { ProfileTab } from "../../contexts/profile";

describe("approved deck engravings", () => {
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
