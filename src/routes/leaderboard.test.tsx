import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouter, memoryHistory } from "@solidjs/router";
import { render, screen, waitFor } from "../../tests/render";
import Leaderboard from "./leaderboard";

const hoisted = vi.hoisted(() => ({
  getLeaderboard: vi.fn(),
  getVibesLeaderboard: vi.fn(),
  getSigilLeaderboard: vi.fn(),
  getTrendingLeaderboard: vi.fn(),
  getNewsLeaderboard: vi.fn(),
  getTransfersLeaderboard: vi.fn(),
  getDirectory: vi.fn(),
  getTeamMetadata: vi.fn(),
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
  getTeamMetadata: hoisted.getTeamMetadata,
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
      rating: 1,
      rating_rank: 81,
      rating_score: 58.4,
      rank: 1,
    },
  ],
};

const newsResponse = {
  page: "news_leaderboard",
  sport: "NBA",
  entity_type: "player",
  scope: { key: "daily", label: "Daily", starts_at: "2026-07-10T04:00:00Z", ends_at: "2026-07-11T04:00:00Z" },
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
      heat: 73,
      rank: 1,
      headline: "Fixture narrative",
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
      heat: 9,
      rank: 1,
      slope: 9,
    },
  ],
};

function renderLeaderboard(path: string) {
  const history = memoryHistory();
  history.set({ value: path, replace: true });
  window.history.replaceState({}, "", path);
  const Router = createRouter({ history, routes: [{ path: "/leaderboard", component: Leaderboard }] });
  return { ...render(() => <Router />), history };
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
  hoisted.getTeamMetadata.mockReset().mockResolvedValue({ players: {}, teams: {} });
});

describe("leaderboard controls", () => {
  it("falls back to Scouting for retired Stories links", async () => {
    const { history } = renderLeaderboard("/leaderboard?sport=NBA&board=stories&status=dormant");
    expect((await screen.findByRole("tab", { name: "Scouting" })).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("tab", { name: "Stories" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Story status" })).toBeNull();
    await waitFor(() => expect(history.get()).not.toContain("stories"));
  });

  it("renders current score fields and updates a retained row's color", async () => {
    const { container, history } = renderLeaderboard("/leaderboard?sport=NBA");
    const metric = () => container.querySelector<HTMLElement>(".lb-metric")!;
    await waitFor(() => expect(metric()?.textContent).toBe("58.4"));
    const originalColor = metric().style.getPropertyValue("--metric-color");
    hoisted.getLeaderboard.mockResolvedValue({ ...ratingResponse, leaders: [{ ...ratingResponse.leaders[0], rating_score: 20 }] });
    history.set({ value: "/leaderboard?sport=NBA&season=2025" });
    await waitFor(() => expect(metric().textContent).toBe("20.0"));
    expect(metric().style.getPropertyValue("--metric-color")).not.toBe(originalColor);
  });

  it("links Vibe rows to the Vibe card", async () => {
    hoisted.getVibesLeaderboard.mockResolvedValue({ leaders: [{ ...newsResponse.leaders[0], headline: "Current mood" }] });
    renderLeaderboard("/leaderboard?sport=NBA&board=vibes");
    const link = await screen.findByRole("link", { name: /Aaron Gordon/ });
    expect(link.getAttribute("href")).toBe("/profile/nba/player/177-aaron-gordon?tab=vibe");
  });

  it("keeps both transfer pairs for one player and links to Transfers", async () => {
    const rumor = { player_id: 177, player_name: "Aaron Gordon", player_image: null,
      team_logo: null, heat: 70, stage: null, direction: null, headline: "Current transfer read", source_names: [] };
    hoisted.getTransfersLeaderboard.mockResolvedValue({ rumors: [
      { ...rumor, team_id: 8, team_name: "Denver Nuggets", rank: 1 },
      { ...rumor, team_id: 9, team_name: "Detroit Pistons", rank: 2 },
    ] });
    renderLeaderboard("/leaderboard?sport=NBA&board=transfers");
    const links = await screen.findAllByRole("link", { name: /Aaron Gordon/ });
    expect(links).toHaveLength(2);
    expect(links.map(link => link.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining("Denver Nuggets"), expect.stringContaining("Detroit Pistons"),
    ]));
    expect(links.every(link => link.getAttribute("href")?.endsWith("?tab=transfers"))).toBe(true);
  });

  it("offers the news view without retired reporting controls", async () => {
    renderLeaderboard("/leaderboard?sport=NBA&board=news");

    expect(await screen.findByRole("button", { name: /^News view:/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "News scope" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Week" })).toBeNull();
    const controls = screen.getByRole("group", { name: "Leaderboard view controls" });
    expect(controls.querySelector("[role='tablist']")).toBeNull();
  });

  it("renders only supported boards and sport as the first Select", async () => {
    renderLeaderboard("/leaderboard?sport=NBA");

    const tabs = (await screen.findAllByRole("tab")).map((t) => t.textContent);
    expect(tabs).toEqual(["Scouting", "Narratives", "Vibe", "Momentum", "Sigil"]);
    expect(screen.getByRole("tab", { name: "Scouting" }).getAttribute("aria-selected")).toBe("true");
    // Sport is a scope — the conditions line's first Select, not a tab.
    expect(screen.queryByRole("tab", { name: "NBA" })).toBeNull();
    expect(screen.getByRole("button", { name: /^Sport:/ }).textContent).toContain("NBA");
  });

  it("lights the Narratives tab for the transfers facet", async () => {
    renderLeaderboard("/leaderboard?sport=NBA&board=transfers");
    expect((await screen.findByRole("tab", { name: "Narratives" })).getAttribute("aria-selected")).toBe("true");
  });

  it.each(["news", "transfers", "vibes", "sigil"])("ignores retired reporting state on the %s board", async board => {
    renderLeaderboard(`/leaderboard?sport=NBA&board=${board}&newsScope=last_week&week=2025-47&year=2025&date=2025-11-20&teamId=8`);
    const read = { news: hoisted.getNewsLeaderboard, transfers: hoisted.getTransfersLeaderboard,
      vibes: hoisted.getVibesLeaderboard, sigil: hoisted.getSigilLeaderboard }[board]!;
    await waitFor(() => expect(read).toHaveBeenCalled());
    const cohort = { leagueId: null, teamId: 8, positionGroup: null, conference: null, division: null };
    expect(read.mock.calls[0]).toEqual(board === "transfers" ? ["nba", 50, 8]
      : board === "sigil" ? ["nba", "player", 50, null, cohort] : ["nba", "player", 50, cohort]);
    expect(screen.queryByRole("button", { name: "Week" })).toBeNull();
    expect(screen.queryByRole("button", { name: "News scope" })).toBeNull();
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

    const alert = await screen.findByRole("alert", { name: "Board unavailable" });
    expect(alert.textContent).toContain("The board could not be read.");
    expect(alert.textContent).toContain("fixture leaderboard outage");
    expect(screen.queryByText("Something went sideways loading this page.")).toBeNull();
  });
});

vi.mock("../lib/data/entity-meta.server", () => ({ getBoardOptions: vi.fn().mockResolvedValue({ teams: [], positions: [] }) }));
