import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import Card, { CardVessel, CARD_SHARING_ENABLED } from "./Card";
import { DECK_ILLUSTRATIONS, deckIllustrationStyle } from "../../lib/cards/deck-illustration";
import type { ProfileTab } from "../../contexts/profile";

vi.mock("@solidjs/router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@solidjs/router")>(),
  createAsync: () => () => undefined,
}));
vi.mock("../../contexts/profile", () => ({
  useProfile: () => ({ sport: () => "football", type: () => "team", id: () => "18" }),
}));

describe("Card's approved engraving", () => {
  it("updates sky and score together, removes null skies, and keeps zero", () => {
    const [score, setScore] = createSignal<number | null>(20);
    const { container } = render(() => <Card id="vibe" score={score}>Reading</Card>);
    const sky = () => container.querySelector(".card-sky");
    expect(sky()?.getAttribute("data-sky")).toBe("moon");
    setScore(50);
    expect(sky()?.getAttribute("data-sky")).toBe("clouds");
    setScore(80);
    expect(sky()?.getAttribute("data-sky")).toBe("sun");
    expect(container.querySelector(".card-score-value")?.textContent).toBe("80");
    setScore(null);
    expect(sky()).toBeNull();
    setScore(0);
    expect(sky()?.getAttribute("data-sky")).toBe("moon");
    expect(sky()?.closest("[aria-hidden=true]")).not.toBeNull();
  });
  it("uses the healthy middle for both busyness cards and preserves Profile", () => {
    for (const id of ["profile", "scouting", "narratives", "transfers", "vibe"] as const) {
      const { container, unmount } = render(() => <Card id={id} score={() => 65}>Reading</Card>);
      expect(container.querySelectorAll(".card-sky")).toHaveLength(1);
      expect(container.querySelector(".card-sky")?.getAttribute("data-sky")).toBe("sun");
      expect(container.querySelector(".card-motif")).not.toBeNull();
      unmount();
    }
  });
  it("moves Momentum's plate reactively without adding a sky", () => {
    const [score, setScore] = createSignal<number | null>(20);
    const { container } = render(() => <Card id="momentum" score={score}>Reading</Card>);
    const top = () => container.querySelector<HTMLElement>(".card-motif")?.style.getPropertyValue("--deck-illustration-top");
    expect(top()).toBe("5%");
    setScore(50);
    expect(top()).toBe("-22.5%");
    setScore(80);
    expect(top()).toBe("-50%");
    setScore(null);
    expect(top()).toBe("-5%");
    expect(container.querySelector(".card-sky")).toBeNull();
  });
  it("never adds skies to Sigil or scoreless comparison cards", () => {
    const { container } = render(() => <><Card id="sigil" score={() => 80}>Oracle</Card><Card id="profile">Comparison</Card></>);
    expect(container.querySelector(".card-sky")).toBeNull();
  });
  it("parks sharing behind a single disabled switch", () => {
    expect(CARD_SHARING_ENABLED).toBe(false);
  });
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
