import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";
import { render, screen } from "@solidjs/testing-library";
import AppTray from "./AppTray";

// The tray resolves recents metadata off the sport meta maps on profile
// paths; keep the directory out of these tests.
vi.mock("../../lib/data/entity-directory", () => ({
  getSportMetaMaps: vi.fn().mockResolvedValue({ players: {}, teams: {} }),
}));

function renderTray(path: string) {
  const history = createMemoryHistory();
  history.set({ value: path, replace: true });
  window.history.replaceState({}, "", path);
  return render(() => (
    <MemoryRouter
      history={history}
      root={(props) => (
        <>
          <AppTray />
          {props.children}
        </>
      )}
    >
      <Route path="*" component={() => null} />
    </MemoryRouter>
  ));
}

beforeEach(() => {
  // happy-dom may not expose storage here; the tray already treats it as
  // best-effort, so the tests do too.
  window.localStorage?.clear();
});

describe("AppTray pages", () => {
  it("is 4 page buttons: home, search, stories, leaderboard", () => {
    renderTray("/leaderboard?sport=NBA");

    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Stories" }).getAttribute("href")).toBe(
      "/stories?sport=NBA",
    );
    expect(screen.getByRole("link", { name: "Leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?sport=NBA",
    );
  });

  it("retired the board rows — boards belong to the leaderboard page", () => {
    renderTray("/leaderboard?sport=NBA");

    for (const board of ["Scouting", "Narratives", "Vibe", "Momentum", "Sigil"]) {
      expect(screen.queryByRole("link", { name: board })).toBeNull();
    }
  });

  it("marks Stories current on the list and on a story detail", () => {
    renderTray("/stories?sport=FOOTBALL");
    expect(screen.getByRole("link", { name: "Stories" }).getAttribute("aria-current")).toBe("page");

    renderTray("/story/football/8125-garnacho");
    const [, detailStories] = screen.getAllByRole("link", { name: "Stories" });
    expect(detailStories.getAttribute("aria-current")).toBe("page");
  });

  it("marks Leaderboard current on any board view", () => {
    renderTray("/leaderboard?sport=NBA&board=sigil");
    expect(screen.getByRole("link", { name: "Leaderboard" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Stories" }).getAttribute("aria-current")).toBeNull();
  });
});
