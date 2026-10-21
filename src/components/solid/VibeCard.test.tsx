import { flush } from "solid-js";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "../../../tests/render";
import type { VibeResponse } from "../../lib/data/vibe.server";
import type { ProfileReads } from "../../lib/data/profile-data";
import { deckHasContent } from "../../lib/cards/deck-content";
import VibeCard from "./VibeCard";

const data = vi.hoisted(() => ({ vibe: null as VibeResponse | null }));
vi.mock("../../contexts/profile", () => ({
  useProfile: () => ({ type: () => "team" }),
}));
vi.mock("../../lib/data/profile-data", () => ({
  useProfileRead: () => () => data.vibe,
  useProfileReads: () => ({ vibe: () => data.vibe }),
}));

beforeEach(() => {
  data.vibe = {
    page: "vibe", sport: "nfl", entity_type: "team", entity_id: 7,
    window_days: 7, snapshots: [{ sentiment: 90, headline: "Wrong older headline", body: "Wrong older body.", generated_at: "2026-09-20T00:00:00Z", trigger_type: "periodic" }],
    current: { id: 3, heat: null, headline: "The speakers disagree", body: "One coach welcomed the move. Another expressed reservations.", generated_at: "2026-09-26T00:00:00Z", trigger_type: "periodic", model_version: "fixture", prompt_version: "fixture", sources: [{ id: 42, publisher: "Wire", url: "https://example.com/42", published_at: "2026-09-25T00:00:00Z" }] },
  };
});

describe("Vibe current card", () => {
  it("renders a stale score-free card with its date and sources, independently of snapshots", async () => {
    const { container } = render(() => <VibeCard />);
    expect(screen.getByRole("heading", { name: "The speakers disagree" })).toBeTruthy();
    expect(container.textContent).toContain("Another expressed reservations.");
    expect(container.textContent).not.toContain("Wrong older");
    expect(container.querySelector(".card-score-slot")).toBeNull();
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-09-26T00:00:00Z");
    expect(container.querySelector("time")?.textContent).toBe("Read Sep 26, 2026");
    expect(screen.getByRole("link", { name: "Wire" }).getAttribute("href")).toBe("https://example.com/42");
    const reads = { vibe: () => data.vibe } as unknown as ProfileReads;
    expect(await deckHasContent({ rateMode: () => "default" } as never, reads, "vibe")).toBe(true);
  });
  it("uses the current product's own score", () => {
    data.vibe!.current!.heat = 65;
    const { container } = render(() => <VibeCard />);
    flush();
    expect(container.querySelector(".card-score-value")?.textContent).toBe("65");
  });
  it("keeps empty current honest even when older snapshots exist", async () => {
    data.vibe!.current = null;
    render(() => <VibeCard />);
    expect(screen.getByText("No supported reading yet.")).toBeTruthy();
    expect(screen.queryByText("Wrong older body.")).toBeNull();
    const reads = { vibe: () => data.vibe } as unknown as ProfileReads;
    expect(await deckHasContent({ rateMode: () => "default" } as never, reads, "vibe")).toBe(false);
  });
});
