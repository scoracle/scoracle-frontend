import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "../../tests/render";
import type { VibeResponse } from "../lib/data/vibe";
import { hasDeckContent } from "../lib/cards/deck-presence";
import VibeCard from "./VibeCard";

const data = vi.hoisted(() => ({ vibe: null as VibeResponse | null }));
vi.mock("../lib/profile-context", () => ({
  useProfile: () => ({ type: () => "team" }),
}));
vi.mock("../lib/profile-products", () => ({
  useProfileRead: () => () => data.vibe,
  useProfileReads: () => ({ vibe: () => data.vibe }),
}));

beforeEach(() => {
  data.vibe = {
    page: "vibe", sport: "nfl", entity_type: "team", entity_id: 7,
    window_days: 7, snapshots: [{ sentiment: 90, headline: "Wrong older headline", body: "Wrong older body.", generated_at: "2026-09-20T00:00:00Z", trigger_type: "periodic" }],
    current: { id: 3, heat: null, headline: "The speakers disagree", body: "One coach welcomed the move. Another expressed reservations.", generated_at: "2026-09-26T00:00:00Z", trigger_type: "periodic", model_version: "fixture", prompt_version: "fixture" },
  };
});

describe("Vibe current card", () => {
  it("renders a stale score-free card with its date, independently of snapshots", async () => {
    const { container } = render(() => <VibeCard current={data.vibe!.current!} score={data.vibe!.current?.heat ?? null} type="team" />);
    expect(screen.getByRole("heading", { name: "The speakers disagree" })).toBeTruthy();
    expect(container.textContent).toContain("Another expressed reservations.");
    expect(container.textContent).not.toContain("Wrong older");
    expect(container.querySelector(".card-score-slot")).toBeNull();
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-09-26T00:00:00Z");
    expect(container.querySelector("time")?.textContent).toBe("Read Sep 26, 2026");
    expect(screen.queryByRole("link")).toBeNull();
    expect(await hasDeckContent({ vibe: data.vibe }, "default", "vibe")).toBe(true);
  });
  it("uses the current product's own score", () => {
    data.vibe!.current!.heat = 65;
    const { container } = render(() => <VibeCard current={data.vibe!.current!} score={data.vibe!.current?.heat ?? null} type="team" />);

    expect(container.querySelector(".card-score-value")?.textContent).toBe("65");
  });
  it("keeps empty current honest even when older snapshots exist", async () => {
    data.vibe!.current = null;
    render(() => <VibeCard current={data.vibe!.current!} score={data.vibe!.current?.heat ?? null} type="team" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText("Wrong older body.")).toBeNull();
    expect(await hasDeckContent({ vibe: data.vibe }, "default", "vibe")).toBe(false);
  });
});
