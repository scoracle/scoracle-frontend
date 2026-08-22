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
  const utils = render(() => (
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
  tray = utils.container;
  return utils;
}

/** The most recent render's tray — tests re-render several paths in one test,
 *  so queries must scope to the latest container, not the whole screen. */
let tray: HTMLElement = document.body;

/** The tray link rows, in DOM order — which is the reading order. */
function leaderboardLinks() {
  return tray.querySelectorAll<HTMLAnchorElement>('[aria-label="Leaderboards"] a');
}

beforeEach(() => {
  // happy-dom may not expose storage here; the tray already treats it as
  // best-effort, so the tests do too.
  window.localStorage?.clear();
});

describe("AppTray leaderboard links", () => {
  it("carries every board surface in reading order, no rows retired", () => {
    renderTray("/leaderboard?sport=NBA");

    const labels = Array.from(leaderboardLinks()).map((a) => a.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Stories",
      "Rating",
      "Narratives",
      "Vibe",
      "Momentum",
      "Transfers",
      "Sigil",
    ]);
  });

  it("points each row at its surface, carrying the active sport", () => {
    renderTray("/profile/nba/player/177-aaron-gordon");

    const hrefs = Array.from(leaderboardLinks()).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/stories?sport=NBA",
      "/leaderboard?sport=NBA",
      "/leaderboard?sport=NBA&board=narratives",
      "/leaderboard?sport=NBA&board=vibes",
      "/leaderboard?sport=NBA&board=momentum",
      "/leaderboard?sport=NBA&board=transfers",
      "/leaderboard?sport=NBA&board=sigil",
    ]);
  });

  it("marks Stories current on the list and on a story detail", () => {
    renderTray("/stories?sport=FOOTBALL");
    expect(leaderboardLinks()[0].getAttribute("aria-current")).toBe("page");

    renderTray("/story/football/8125-garnacho");
    expect(leaderboardLinks()[0].getAttribute("aria-current")).toBe("page");
  });

  it("marks Rating current by default and for every alias of the default board", () => {
    renderTray("/leaderboard?sport=NBA");
    expect(leaderboardLinks()[1].getAttribute("aria-current")).toBe("page");

    renderTray("/leaderboard?sport=NBA&board=composite");
    expect(leaderboardLinks()[1].getAttribute("aria-current")).toBe("page");
  });

  it("marks each board row current on its own ?board= value", () => {
    const cases: Array<[string, number]> = [
      ["narratives", 2],
      ["news", 2], // the page's own alias — Narratives stays lit
      ["vibes", 3],
      ["momentum", 4],
      ["trending", 4],
      ["transfers", 5],
      ["sigil", 6],
    ];
    for (const [board, idx] of cases) {
      renderTray(`/leaderboard?sport=NBA&board=${board}`);
      const links = leaderboardLinks();
      for (const [i, link] of Array.from(links).entries()) {
        expect(link.getAttribute("aria-current"), `board=${board} row ${i}`).toBe(
          i === idx ? "page" : null,
        );
      }
    }
  });

  it("leaves the group unlit away from the boards", () => {
    renderTray("/");
    for (const link of Array.from(leaderboardLinks())) {
      expect(link.getAttribute("aria-current")).toBeNull();
    }
  });
});
