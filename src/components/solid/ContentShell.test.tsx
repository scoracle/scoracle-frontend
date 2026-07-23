import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route } from "@solidjs/router";
import { render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import {
  ProfileContext,
  type NewsScope,
  type ProfileContextValue,
  type ProfileTab,
  type RateMode,
  type RatingScope,
  type ScoreModel,
} from "../../contexts/profile";
import type { CardControl, CardDef } from "./card-registry";
import ContentShell from "./ContentShell";

const hoisted = vi.hoisted(() => ({
  registry: [] as CardDef[],
  getStats: vi.fn(),
}));

vi.mock("./card-registry", () => ({
  get CARD_REGISTRY() {
    return hoisted.registry;
  },
}));

vi.mock("../../lib/data/stats.server", () => ({
  getStats: hoisted.getStats,
}));

function pane(
  id: ProfileTab,
  label: string,
  body: () => JSX.Element,
  controls: readonly CardControl[] = [],
): CardDef {
  return {
    id,
    label,
    body,
    fallback: () => <div>Loading {label}</div>,
    controls,
  };
}

function profileContext(activeTab: ProfileTab): ProfileContextValue {
  return {
    sport: () => "nba",
    type: () => "player",
    id: () => "177",
    activeTab: () => activeTab,
    setActiveTab: vi.fn(),
    season: () => null,
    setSeason: vi.fn(),
    scope: () => "all" as RatingScope,
    setScope: vi.fn(),
    rateMode: () => "default" as RateMode,
    setRateMode: vi.fn(),
    scoreModel: () => "regular" as ScoreModel,
    setScoreModel: vi.fn(),
    vs: () => null,
    setVs: vi.fn(),
    newsScope: () => "current_week" as NewsScope,
    setNewsScope: vi.fn(),
  };
}

function renderShell(activeTab: ProfileTab) {
  return render(() => (
    <MemoryRouter>
      <Route
        path="/*"
        component={() => (
          <ProfileContext.Provider value={profileContext(activeTab)}>
            <ContentShell />
          </ProfileContext.Provider>
        )}
      />
    </MemoryRouter>
  ));
}

beforeEach(() => {
  hoisted.registry.splice(0);
  hoisted.getStats.mockReset();
  hoisted.getStats.mockResolvedValue(null);
});

describe("ContentShell panes", () => {
  it("renders all registry-visible panes in the tree", () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="scouting-pane">Scouting body</div>),
      pane("narratives", "Narratives", () => <div data-testid="narratives-pane">Narratives body</div>),
      pane("transfers", "Transfers", () => <div data-testid="transfers-pane">Transfers body</div>),
    );

    renderShell("scouting");

    expect(screen.getByTestId("scouting-pane")).toBeTruthy();
    expect(screen.getByTestId("narratives-pane")).toBeTruthy();
    expect(screen.getByTestId("transfers-pane")).toBeTruthy();
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(3);
  });

  it("labels the Transfers tab with the sport-aware noun (NBA → Trades)", () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("transfers", "Transfers", () => <div>Transfers body</div>),
    );

    renderShell("scouting");

    expect(screen.getByRole("tab", { name: "Trades" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Transfers" })).toBeNull();
  });

  it("contains a hidden pane error without replacing the active pane", () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="active-pane">Active scouting</div>),
      pane("momentum", "Momentum", () => {
        throw new Error("fixture momentum outage");
      }),
    );

    renderShell("scouting");

    expect(screen.getByTestId("active-pane").textContent).toBe("Active scouting");
    expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("Couldn't load Momentum.");
    expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("fixture momentum outage");
  });
});

describe("ContentShell controls", () => {
  it("fails profile stat-backed controls closed without replacing panes", async () => {
    hoisted.getStats.mockRejectedValue(new Error("fixture controls outage"));
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="active-pane">Active scouting</div>, ["season"]),
      pane("narratives", "Narratives", () => <div>Narratives body</div>),
    );

    renderShell("scouting");

    expect(screen.getByTestId("active-pane").textContent).toBe("Active scouting");
    await waitFor(() => expect(hoisted.getStats).toHaveBeenCalled());
    expect(screen.queryByText("fixture controls outage")).toBeNull();
  });

  it("renders the shared news scope as a Select control, not an item rail", () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("narratives", "Narratives", () => <div>Narratives body</div>, ["newsScope"]),
    );

    renderShell("narratives");

    const controls = screen.getByRole("group", { name: "Profile view controls" });
    expect(screen.getByRole("button", { name: "News scope" })).toBeTruthy();
    expect(controls.querySelector("[role='tablist']")).toBeNull();
  });
});
