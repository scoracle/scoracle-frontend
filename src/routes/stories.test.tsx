import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetaProvider } from "@solidjs/meta";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";
import { render, screen, waitFor } from "@solidjs/testing-library";
import Leaderboard from "./leaderboard";

// The Stories register is the leaderboard's ?board=stories (2026-09-07), so
// these render the leaderboard page at that board. The page's other reads
// (rank boards, cohort directory, weeks) are stubbed quiet.
const hoisted = vi.hoisted(() => ({
  getStories: vi.fn(),
}));

vi.mock("../lib/data/stories.server", () => ({
  getStories: hoisted.getStories,
}));

vi.mock("../lib/data/leaderboard.server", () => ({
  getLeaderboard: vi.fn().mockResolvedValue(null),
  getVibesLeaderboard: vi.fn().mockResolvedValue(null),
  getSigilLeaderboard: vi.fn().mockResolvedValue(null),
  getTrendingLeaderboard: vi.fn().mockResolvedValue(null),
  getNewsLeaderboard: vi.fn().mockResolvedValue(null),
  getTransfersLeaderboard: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/data/entity-directory", () => ({
  getDirectory: vi.fn().mockResolvedValue([]),
  getSportMetaMaps: vi.fn().mockResolvedValue({ players: {}, teams: {} }),
}));

vi.mock("../lib/data/weeks.server", () => ({
  getWeeks: vi.fn().mockResolvedValue({ weeks: [] }),
}));

const activeResponse = {
  page: "stories",
  sport: "football",
  scope: "active",
  stories: [
    {
      storyline_id: 8125,
      title: "Garnacho aims dig at Chelsea after Aston Villa debut",
      status: "open",
      heat: 99,
      headline: "Garnacho takes swipe at Chelsea after making Villa debut",
      story_types: ["fixture", "transfer"],
      register: "anticipation",
      report_count: 30,
      last_seen_at: "2026-08-08T04:45:50Z",
      cast: [
        { entity_type: "team", entity_id: 15, name: "Aston Villa", role: "subject" },
        { entity_type: "player", entity_id: 37316549, name: "Alejandro Garnacho", role: "subject" },
      ],
    },
    {
      // headline is null until a packet compiles — the title carries the row.
      storyline_id: 7667,
      title: "Villa hero on Watkins transfer",
      status: "open",
      heat: 97,
      headline: null,
      story_types: ["transfer"],
      register: null,
      report_count: 1,
      last_seen_at: "2026-08-06T16:38:12Z",
      cast: [{ entity_type: "player", entity_id: 12145, name: "Ollie Watkins", role: "subject" }],
    },
  ],
};

const dormantResponse = {
  page: "stories",
  sport: "football",
  scope: "dormant",
  stories: [
    {
      storyline_id: 7487,
      title: "Forest close to Diomande deal",
      status: "dormant",
      headline: "Forest close to Diomande deal",
      report_count: 3,
      cast_count: 2,
      first_seen_at: "2026-07-29T13:05:13Z",
      last_seen_at: "2026-07-29T13:05:13Z",
      resolved_at: null,
    },
  ],
};

/** Render the leaderboard page at its Stories board with the given query. */
function renderStories(query: string) {
  const path = `/leaderboard?board=stories&${query}`;
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
  hoisted.getStories.mockReset().mockResolvedValue(activeResponse);
});

describe("stories board (leaderboard ?board=stories)", () => {
  it("renders open storylines in served order with the heat metric", async () => {
    renderStories("sport=FOOTBALL");

    expect(
      await screen.findByText("Garnacho takes swipe at Chelsea after making Villa debut"),
    ).toBeTruthy();
    // Active scope: no status param goes to the fetcher.
    expect(hoisted.getStories.mock.calls[0]).toEqual(["football", null, 50]);
    // Heat is the metric column.
    expect(screen.getByText("99")).toBeTruthy();
    expect(screen.getByText("Heat")).toBeTruthy();
  });

  it("falls back to the storyline title when no packet headline exists", async () => {
    renderStories("sport=FOOTBALL");

    expect(await screen.findByText("Villa hero on Watkins transfer")).toBeTruthy();
  });

  it("links each row to the story detail path", async () => {
    renderStories("sport=FOOTBALL");

    const row = await screen.findByText("Villa hero on Watkins transfer");
    const link = row.closest("a");
    expect(link?.getAttribute("href")).toBe("/story/football/7667-villa-hero-on-watkins-transfer");
  });

  it("requests the archive scope and ranks it by reports", async () => {
    hoisted.getStories.mockResolvedValue(dormantResponse);
    renderStories("sport=FOOTBALL&status=dormant");

    expect(await screen.findByText("Forest close to Diomande deal")).toBeTruthy();
    expect(hoisted.getStories.mock.calls[0]).toEqual(["football", "dormant", 50]);
    expect(screen.getByText("Reports")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("offers the status scope as a Select on the conditions line", async () => {
    renderStories("sport=FOOTBALL");

    expect(await screen.findByRole("button", { name: "Story status" })).toBeTruthy();
  });

  it("keeps fetch failures inside the stories boundary", async () => {
    hoisted.getStories.mockRejectedValue(new Error("fixture stories outage"));

    renderStories("sport=FOOTBALL");

    const alert = await screen.findByRole("alert", { name: "Board unavailable" });
    expect(alert.textContent).toContain("fixture stories outage");
    expect(screen.queryByText("Something went sideways loading this page.")).toBeNull();
  });
});
