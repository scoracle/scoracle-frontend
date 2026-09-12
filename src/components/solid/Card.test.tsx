import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { CardVessel } from "./Card";
import { DECK_ILLUSTRATIONS, deckIllustrationStyle } from "../../lib/cards/deck-illustration";
import type { ProfileTab } from "../../contexts/profile";

describe("Card's approved engraving", () => {
  it("keeps the frame and foot while applying every approved crop", () => {
    for (const deck of Object.keys(DECK_ILLUSTRATIONS) as ProfileTab[]) {
      const { container, unmount } = render(() => (
        <CardVessel deck={deck} title="The Star">Reading</CardVessel>
      ));
      const motif = container.querySelector<HTMLElement>(".card-wash .card-motif")!;
      for (const [key, value] of Object.entries(deckIllustrationStyle(deck))) {
        expect(motif.style.getPropertyValue(key)).toBe(value);
      }
      expect(container.querySelector(".card-wash")?.getAttribute("aria-hidden")).toBe("true");
      expect(container.querySelectorAll(".card-frame path")).toHaveLength(2);
      expect(container.querySelector(".card-foot-name")?.textContent).toBe("The Star");
      unmount();
    }
  });

  it("keeps the plain meta and share vessel free of deck artwork", () => {
    const { container } = render(() => <CardVessel>Identity</CardVessel>);
    expect(container.querySelector(".card-motif")).toBeNull();
  });
});
