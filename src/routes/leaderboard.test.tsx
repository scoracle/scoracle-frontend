import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetaProvider } from "@solidjs/meta";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";
import { render, screen, waitFor } from "@solidjs/testing-library";
import Leaderboard from "./leaderboard";

const hoisted = vi.hoisted(() => ({
  getLeaderboard: vi.fn(),
  getVibesLeaderboard: vi.fn(),
  getSigilLeaderboard: vi.fn(),
  getTrendingLeaderboard: vi.fn(),
  getNewsLeaderboard: vi.fn(),
  getTransfersLeaderboard: vi.fn(),
  getDirectory: vi.fn(),
  getSportMetaMaps: vi.fn(),
}));

vi.mock("../lib/data/leaderboard.server", () => ({
  getLeaderboard: hoisted.getLeaderboard,
  getVibesLeaderboard: hoisted.getVibesLeaderboard,
  getSigilLeaderboard: hoisted.getSigilLeaderboard,
  getTrendingLeaderboard: hoisted.getTrendingLeaderboard,
  getNewsLeaderboard: hoisted.getNewsLeaderboard,
  getTransfersLeaderboard: hoisted.getTransfersLeaderboard,
}));

vi.mock("../lib/data/entity-directory", () => ({
  getDirectory: hoisted.getDirectory,
  getSportMetaMaps: hoisted.getSportMetaMaps,
}));

const ratingResponse = {
  page: "leaderboard",
  sport: "NBA",
  entity_type: "player",
  season: 2026,
  available_seasons: [2026, 2025],
  scope: "composite",
  count: 1,
  leaders: [
    {
      entity_type: "player",
      id: 177,
      name: "Aaron Gordon",
      image: null,
      position: "F",
      team_id: 8,
      team_name: "Denver Nuggets",
      team_code: "DEN",
      team_logo: null,
      league_id: null,
      rating_composite: 1,
      rating_peak: 1,
      rating_peak_label: "Finishing",
      rating_composite_rank: 81,
      rating_peak_rank: 77,
      rating_composite_score: 58.4,
      rating_peak_score: 56.1,
      rank: 1,
    },
  ],
};

const newsResponse = {
  page: "news_leaderboard",
  sport: "NBA",
  entity_type: "player",
  scope: "current_week",
  count: 1,
  leaders: [
    {
      entity_type: "player",
      id: 177,
      name: "Aaron Gordon",
      image: null,
      team_id: 8,
      team_name: "Denver Nuggets",
      team_code: "DEN",
      team_logo: null,
      score: 73,
      rank: 1,
      narrative_title: "Fixture narrative",
      body: "Fixture news body",
      updated_at: "2026-07-10T12:00:00Z",
      source_count: 1,
      source_names: ["Fixture Wire"],
      source_latest_at: "2026-07-10T12:00:00Z",
      source_oldest_at: "2026-07-10T12:00:00Z",
      trajectory: "developing_story",
      trajectory_label: "Developing story",
      trajectory_components: {},
    },
  ],
};

const momentumResponse = {
  page: "trending_leaderboard",
  metric: "rating",
  sport: "NBA",
  entity_type: "player",
  count: 1,
  leaders: [
    {
      entity_type: "player",
      id: 177,
      name: "Aaron Gordon",
      image: null,
      team_id: 8,
      team_name: "Denver Nuggets",
      team_code: "DEN",
      team_logo: null,
      score: 9,
      rank: 1,
      slope: 9,
    },
  ],
};

function renderLeaderboard(path: string) {
  const history = createMemoryHistory();
  history.set({ value: path, replace: true });
  window.history.replaceState({}, "", path);
  return render(() => (
    <MetaProvider>
      <MemoryRouter history={history}>
        <Route path="/leaderboard" component={() => <Leaderboard />} />
      </MemoryRouter>
    </MetaProvider>
  ));
}

beforeEach(() => {
  hoisted.getLeaderboard.mockReset().mockResolvedValue(ratingResponse);
  hoisted.getVibesLeaderboard.mockReset().mockResolvedValue({ page: "vibes_leaderboard", leaders: [] });
  hoisted.getSigilLeaderboard.mockReset().mockResolvedValue({ page: "sigil_leaderboard", leaders: [], season: 2026 });
  hoisted.getTrendingLeaderboard.mockReset().mockResolvedValue(momentumResponse);
  hoisted.getNewsLeaderboard.mockReset().mockResolvedValue(newsResponse);
  hoisted.getTransfersLeaderboard.mockReset().mockResolvedValue({ page: "transfers_leaderboard", rumors: [] });
  hoisted.getDirectory.mockReset().mockResolvedValue([
    { id: "8", name: "Denver Nuggets", type: "team", sport: "nba" },
    { id: "177", name: "Aaron Gordon", type: "player", sport: "nba", positionGroup: "Forward" },
  ]);
  hoisted.getSportMetaMaps.mockReset().mockResolvedValue({ players: {}, teams: {} });
});

describe("leaderboard controls", () => {
  it("renders News time scopes as a dropdown Select, not an item rail", async () => {
    renderLeaderboard("/leaderboard?sport=NBA&board=news");

    expect(await screen.findByRole("button", { name: "News scope" })).toBeTruthy();
    const controls = screen.getByRole("group", { name: "Leaderboard view controls" });
    expect(controls.querySelector("[role='tablist']")).toBeNull();
  });

  it("renders sport as the tab rail; board selection lives in the AppTray", () => {
    renderLeaderboard("/leaderboard?sport=NBA");

    // Sport is the tab rail now (the NavWell's tab row).
    expect(screen.getByRole("tab", { name: "NBA" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "NFL" })).toBeTruthy();
    // Boards are NOT tabs — board switching moved to the AppTray.
    expect(screen.queryByRole("tablist", { name: "Select leaderboard" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Momentum" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Sigil" })).toBeNull();
  });

  it("requests momentum leaderboards with metric before entity type", async () => {
    renderLeaderboard("/leaderboard?sport=NBA&board=momentum&metric=rating");

    await waitFor(() => expect(hoisted.getTrendingLeaderboard).toHaveBeenCalled());
    expect(hoisted.getTrendingLeaderboard.mock.calls[0].slice(0, 4)).toEqual([
      "nba",
      "rating",
      "player",
      50,
    ]);
  });
});

describe("leaderboard errors", () => {
  it("keeps board fetch failures inside the leaderboard boundary", async () => {
    hoisted.getLeaderboard.mockRejectedValue(new Error("fixture leaderboard outage"));

    renderLeaderboard("/leaderboard?sport=NBA");

    const alert = await screen.findByRole("alert", { name: "Leaderboard unavailable" });
    expect(alert.textContent).toContain("Couldn't load this board.");
    expect(alert.textContent).toContain("fixture leaderboard outage");
    expect(screen.queryByText("Something went sideways loading this page.")).toBeNull();
  });
});
