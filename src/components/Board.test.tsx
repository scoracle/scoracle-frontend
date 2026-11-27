import { render } from "../../tests/render";
import { describe, expect, it } from "vitest";
import Board from "./Board";
import { DECK_ILLUSTRATIONS, deckIllustrationStyle } from "../lib/cards/deck-illustration";
import { DECK_HUES } from "../lib/cards/card-meta";
import type { ProfileTab } from "../lib/profile-context";

describe("Board's shared engraving", () => {
  it("uses the matching card’s engraving and tint behind populated rows", () => {
    for (const deck of Object.keys(DECK_ILLUSTRATIONS) as ProfileTab[]) {
      const { container, unmount } = render(() => (
        <Board title="Rankings" deck={deck} count="1 ranked"><ol class="board-register" /></Board>
      ));
      const sheet = container.querySelector<HTMLElement>(`.board[data-deck="${deck}"]`)!;
      expect(sheet.style.getPropertyValue("--deck-hue")).toBe(DECK_HUES[deck]);
      expect(sheet.querySelector(".board-field .board-register")).toBeTruthy();
      expect(sheet.querySelector<HTMLElement>(".board-field")!.style.getPropertyValue("--deck-illustration-src"))
        .toBe(deckIllustrationStyle(deck)["--deck-illustration-src"]);
      expect(sheet.querySelector(".board-watermark")).toBeNull();
      expect(container.querySelectorAll(".board-rule")).toHaveLength(1);
      unmount();
    }
  });

  it("leaves boards without a character on neutral stock", () => {
    const { container } = render(() => <Board title="Fantasy">Ranking</Board>);
    expect(container.querySelector(".board[data-deck]")).toBeNull();
  });
});
