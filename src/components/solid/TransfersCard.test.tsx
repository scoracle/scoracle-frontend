import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../tests/render";
import type { TransfersResponse } from "../../lib/data/transfers.server";
import type { ProfileReads } from "../../lib/data/profile-data";
import { deckHasContent } from "../../lib/cards/deck-content";
import TransfersCard from "./TransfersCard";

const data = vi.hoisted(() => ({ transfers: null as TransfersResponse | null }));
vi.mock("../../contexts/profile", () => ({
  useProfile: () => ({ type: () => "player", sport: () => "nba" }),
}));
vi.mock("../../lib/data/profile-data", () => ({
  useProfileRead: () => () => data.transfers,
  useProfileReads: () => ({ transfers: () => data.transfers }),
}));

describe("the Insider's current reading", () => {
  it("deals and renders a published reading even without rumor rows", async () => {
    data.transfers = {
      page: "transfers", sport: "nba", entity_type: "player", entity_id: 177,
      scope: { key: "daily", label: "Daily", starts_at: "2026-09-01", ends_at: "2026-09-02" },
      headline: "A quiet wire", wire_read: "No supported move is reported.", card_score: 0, transfers: [],
    };
    render(() => <TransfersCard />);
    expect(screen.getByRole("heading", { name: "A quiet wire" })).toBeTruthy();
    expect(screen.getByText("No supported move is reported.")).toBeTruthy();
    const reads = { transfers: () => data.transfers } as unknown as ProfileReads;
    expect(await deckHasContent({ rateMode: () => "default" } as never, reads, "transfers")).toBe(true);
    data.transfers = null;
    expect(await deckHasContent({ rateMode: () => "default" } as never, reads, "transfers")).toBe(false);
  });
});
