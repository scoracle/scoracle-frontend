import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, createMemoryHistory } from "@solidjs/router";
import { render } from "@solidjs/testing-library";
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

const brand = () => tray.querySelector<HTMLAnchorElement>(".app-tray-brand")!;
const leaderboard = () => tray.querySelector<HTMLAnchorElement>('[aria-label="Leaderboard"]')!;

beforeEach(() => {
  // happy-dom may not expose storage here; the tray already treats it as
  // best-effort, so the tests do too.
  window.localStorage?.clear();
});

describe("AppTray — the minimal rail (2026-09-07)", () => {
  it("carries the brand (home), the expand toggle, Search, Leaderboard and Settings — nothing else", () => {
    renderTray("/leaderboard?sport=NBA");

    expect(brand().getAttribute("href")).toBe("/");
    expect(brand().getAttribute("aria-label")).toBe("Home");
    expect(tray.querySelector('[aria-label="Expand menu"]')).toBeTruthy();
    expect(leaderboard()).toBeTruthy();
    expect(tray.querySelector('[aria-label="Settings"]')).toBeTruthy();

    // The board rows retired with the rail; Search routes home.
    const rows = Array.from(tray.querySelectorAll<HTMLAnchorElement>('[aria-label="Pages"] a'));
    expect(rows.map((a) => a.getAttribute("aria-label"))).toEqual(["New search", "Leaderboard"]);
    expect(rows[0].getAttribute("href")).toBe("/");
    expect(tray.querySelector('[aria-label="Stories"]')).toBeNull();
  });

  it("never lights the New search row — the brand carries home", () => {
    renderTray("/");
    expect(tray.querySelector('[aria-label="New search"]')!.getAttribute("aria-current")).toBeNull();
  });

  it("points the Leaderboard row at the page, carrying the active sport", () => {
    renderTray("/profile/nba/player/177-aaron-gordon");
    expect(leaderboard().getAttribute("href")).toBe("/leaderboard?sport=NBA");
  });

  it("marks Leaderboard current on every board and on a story detail", () => {
    for (const path of [
      "/leaderboard?sport=NBA",
      "/leaderboard?sport=NBA&board=stories",
      "/leaderboard?sport=NBA&board=sigil",
      "/story/football/8125-garnacho",
    ]) {
      renderTray(path);
      expect(leaderboard().getAttribute("aria-current"), path).toBe("page");
    }
  });

  it("marks the brand current at home and leaves the Leaderboard row unlit", () => {
    renderTray("/");
    expect(brand().getAttribute("aria-current")).toBe("page");
    expect(leaderboard().getAttribute("aria-current")).toBeNull();
  });

  it("leaves both unlit on a profile", () => {
    renderTray("/profile/nba/player/177-aaron-gordon");
    expect(brand().getAttribute("aria-current")).toBeNull();
    expect(leaderboard().getAttribute("aria-current")).toBeNull();
  });
});
