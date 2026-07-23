import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route } from "@solidjs/router";
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
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

  it("deals every pane as a card slot: face-down backs are buttons with character-card labels", () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("vibe", "Vibe", () => <div>Vibe body</div>),
      pane("sigil", "Sigil", () => <div>Sigil body</div>),
    );

    renderShell("scouting");

    // Face-down panes: back button interactive, front face hidden + inert.
    expect(
      screen.getByRole("button", { name: "Turn the Vibe card face-up — The Influencer" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Turn the Sigil card face-up — the Oracle" }),
    ).toBeTruthy();
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(3);
    const hiddenFaces = panels.filter((p) => p.getAttribute("aria-hidden") === "true");
    expect(hiddenFaces).toHaveLength(2);
    for (const face of hiddenFaces) expect(face.hasAttribute("inert")).toBe(true);

    // The face-up pane: front exposed, its own back out of reach (inert).
    const activeFace = panels.find((p) => p.getAttribute("aria-hidden") !== "true")!;
    expect(activeFace.hasAttribute("inert")).toBe(false);
    expect(activeFace.textContent).toContain("Scouting body");
    // The active back is aria-hidden (out of the accessibility tree), so
    // reach it by attribute: it must be inert until its card flips down.
    const activeBack = document.querySelector(
      'button[aria-label="Turn the Scouting card face-up — The Scout"]',
    )!;
    expect(activeBack.getAttribute("aria-hidden")).toBe("true");
    expect(activeBack.hasAttribute("inert")).toBe(true);
  });

  it("flips a card up through the same setActiveTab the rail uses", () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("momentum", "Momentum", () => <div>Momentum body</div>),
    );

    const ctx = profileContext("scouting");
    render(() => (
      <MemoryRouter>
        <Route
          path="/*"
          component={() => (
            <ProfileContext.Provider value={ctx}>
              <ContentShell />
            </ProfileContext.Provider>
          )}
        />
      </MemoryRouter>
    ));

    fireEvent.click(
      screen.getByRole("button", { name: "Turn the Momentum card face-up — The Analyst" }),
    );
    expect(ctx.setActiveTab).toHaveBeenCalledWith("momentum");
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
