import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetaProvider } from "@solidjs/meta";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import StoryPage from "./story/[sport]/[id]";

const hoisted = vi.hoisted(() => ({
  getStory: vi.fn(),
}));

vi.mock("../lib/data/stories.server", () => ({
  getStory: hoisted.getStory,
}));

/** Mega-storyline-shaped fixture: enough claims and cast to cross the
 *  client-side truncation caps (8 claims, 12 cast). */
const storyResponse = {
  page: "story",
  sport: "football",
  storyline_id: 8125,
  title: "Garnacho aims dig at Chelsea after Aston Villa debut",
  status: "open",
  story_types: null,
  first_seen_at: "2026-08-02T07:49:34Z",
  last_seen_at: "2026-08-08T04:45:50Z",
  resolved_at: null,
  resolution: null,
  cast: [
    {
      entity_type: "team",
      entity_id: 15,
      name: "Aston Villa",
      role: "subject",
      joined_at: "2026-08-02T07:49:34Z",
      last_seen_at: "2026-08-08T04:45:50Z",
      left_at: null,
      exit_reason: null,
    },
    {
      entity_type: "person",
      entity_id: 175,
      name: "Unai Emery",
      role: "subject",
      joined_at: "2026-08-02T07:49:34Z",
      last_seen_at: "2026-08-08T04:45:50Z",
      left_at: null,
      exit_reason: null,
    },
    {
      entity_type: "player",
      entity_id: 968,
      name: "Ross Barkley",
      role: "passing_mention",
      joined_at: "2026-08-02T10:22:44Z",
      last_seen_at: "2026-08-03T06:21:14Z",
      left_at: "2026-08-05T00:00:00Z",
      exit_reason: "faded_out",
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      entity_type: "player",
      entity_id: 1000 + i,
      name: `Squad Player ${i + 1}`,
      role: "opponent",
      joined_at: "2026-08-02T07:49:34Z",
      last_seen_at: "2026-08-08T04:45:50Z",
      left_at: null,
      exit_reason: null,
    })),
  ],
  packets: [
    {
      id: 11554,
      day: "2026-08-08",
      compiled_at: "2026-08-08T05:00:52Z",
      headline: "Garnacho takes swipe at Chelsea after making Villa debut",
      story_types: ["fixture", "transfer"],
      register: "anticipation",
    },
    {
      id: 5882,
      day: "2026-08-06",
      compiled_at: "2026-08-06T09:30:51Z",
      headline: "Villa debut looms for Garnacho",
      story_types: ["fixture"],
      register: null,
    },
  ],
  latest_packet: {
    id: 11554,
    day: "2026-08-08",
    compiled_at: "2026-08-08T05:00:52Z",
    headline: "Garnacho takes swipe at Chelsea after making Villa debut",
    story_types: ["fixture", "transfer"],
    register: "anticipation",
    register_phrase: "Happy to be enjoying football again.",
    claims: Array.from({ length: 10 }, (_, i) => ({
      fact: `Grounded claim number ${i + 1}`,
      source: "Fixture Wire",
      article_id: 322233,
      story_type: "transfer",
      published_at: 1786130414,
    })),
    quotes: [
      {
        quote: "First start after three months.",
        source: "Fixture Wire",
        entity_id: 175,
        entity_type: "person",
        article_id: 322233,
      },
    ],
    facts: {
      result_line: "Bayern Munich vs. Aston Villa airs on FOX Deportes.",
      story_types: ["fixture", "transfer"],
      member_articles: 30,
      entities: [],
    },
  },
  articles: [
    {
      article_id: 322233,
      title: "Aston Villa receive Jonathan Rowe boost",
      source: "Football FanCast",
      url: "https://example.com/rowe-boost",
      published_at: "2026-08-07T15:20:14Z",
      attached_at: "2026-08-08T04:45:50Z",
    },
  ],
  voice_products: [],
};

function renderStory(path: string) {
  const history = createMemoryHistory();
  history.set({ value: path, replace: true });
  window.history.replaceState({}, "", path);
  return render(() => (
    <MetaProvider>
      <MemoryRouter history={history}>
        <Route path="/story/:sport/:id" component={() => <StoryPage />} />
      </MemoryRouter>
    </MetaProvider>
  ));
}

beforeEach(() => {
  hoisted.getStory.mockReset().mockResolvedValue(storyResponse);
});

describe("story page", () => {
  it("renders the storyline whole: history, packet, cast, wire", async () => {
    renderStory("/story/football/8125-garnacho-aims-dig");

    expect(
      await screen.findByRole("heading", { name: "Garnacho aims dig at Chelsea after Aston Villa debut" }),
    ).toBeTruthy();
    // Routing keys on the leading numeric id; the slug is sugar.
    expect(hoisted.getStory.mock.calls[0]).toEqual(["football", "8125"]);
    // The headline history — the packet chain, both days on the sheet.
    expect(screen.getByText("Villa debut looms for Garnacho")).toBeTruthy();
    // The latest packet's grounding.
    expect(screen.getByText("Bayern Munich vs. Aston Villa airs on FOX Deportes.")).toBeTruthy();
    expect(screen.getByText("Happy to be enjoying football again.")).toBeTruthy();
    // The wire, linking out.
    const article = screen.getByText("Aston Villa receive Jonathan Rowe boost");
    expect(article.closest("a")?.getAttribute("href")).toBe("https://example.com/rowe-boost");
  });

  it("links player/team cast to profiles and leaves persons unlinked", async () => {
    renderStory("/story/football/8125");

    const team = await screen.findByText("Aston Villa");
    expect(team.closest("a")?.getAttribute("href")).toBe("/profile/football/team/15-aston-villa");
    const person = screen.getByText("Unai Emery");
    expect(person.closest("a")).toBeNull();
  });

  it("keeps departed members on the cast with their exit", async () => {
    renderStory("/story/football/8125");

    // Departed members close the cast — past the 12-member cut here, so the
    // exit row is behind the toggle.
    fireEvent.click(await screen.findByRole("button", { name: "Show all 15 cast members" }));
    const departed = screen.getByText("Ross Barkley").closest("li")!;
    expect(departed.className).toContain("story-member-departed");
    expect(departed.textContent).toContain("passing mention");
    expect(departed.textContent).toContain("faded out");
  });

  it("truncates mega-storyline lists behind show-all toggles", async () => {
    renderStory("/story/football/8125");

    // 10 claims, 8 shown: the 9th waits behind the toggle.
    const toggle = await screen.findByRole("button", { name: "Show all 10 claims" });
    expect(screen.queryByText("Grounded claim number 9")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText("Grounded claim number 9")).toBeTruthy();

    // 15 cast, 12 shown — and the departed member sorts to the tail, so the
    // pre-toggle cut hides the exit row too.
    expect(screen.getByRole("button", { name: "Show all 15 cast members" })).toBeTruthy();
  });

  it("renders the not-found face on an unknown id", async () => {
    hoisted.getStory.mockResolvedValue(null);

    renderStory("/story/football/999999");

    expect(await screen.findByRole("heading", { name: "Story not found" })).toBeTruthy();
    const back = screen.getByText("Back to stories");
    expect(back.getAttribute("href")).toBe("/stories?sport=FOOTBALL");
  });
});
