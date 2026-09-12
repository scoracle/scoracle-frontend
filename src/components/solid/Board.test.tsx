import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import Board from "./Board";
import { DECK_ILLUSTRATIONS, deckIllustrationStyle } from "../../lib/cards/deck-illustration";
import type { ProfileTab } from "../../contexts/profile";

describe("Board's shared engraving", () => {
  it("uses each card's approved composition only inside the masthead", () => {
    for (const deck of Object.keys(DECK_ILLUSTRATIONS) as ProfileTab[]) {
      const { container, unmount } = render(() => (
        <Board title="Rankings" deck={deck}><ol class="board-register" /></Board>
      ));
      const device = container.querySelector<HTMLElement>(".board-masthead .board-device")!;
      for (const [key, value] of Object.entries(deckIllustrationStyle(deck))) {
        expect(device.style.getPropertyValue(key)).toBe(value);
      }
      expect(container.querySelector(".board-register .board-device")).toBeNull();
      expect(container.querySelectorAll(".board-rule")).toHaveLength(1);
      unmount();
    }
  });

  it("leaves boards without a character unillustrated", () => {
    const { container } = render(() => <Board title="Fantasy">Ranking</Board>);
    expect(container.querySelector(".board-device")).toBeNull();
  });
});
