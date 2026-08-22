import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route } from "@solidjs/router";
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import {
  ProfileContext,
  type NewsScope,
  type ProfileContextValue,
  type ProfileTab,
  type RateMode,
  type RatingScope,
  type ScoreModel,
  type ViewMode,
} from "../../contexts/profile";
import type { CardControl, CardDef } from "./card-registry";
import ReadingTable from "./ReadingTable";

const hoisted = vi.hoisted(() => ({
  registry: [] as CardDef[],
  getStats: vi.fn(),
  deckHasContent: vi.fn(),
}));

vi.mock("./card-registry", () => ({
  get CARD_REGISTRY() {
    return hoisted.registry;
  },
}));

vi.mock("../../lib/data/stats.server", () => ({
  getStats: hoisted.getStats,
}));

// The deck is dealt from what the entity holds (lib/cards/deck-content); the
// fixtures decide who is holding what. Default: every registry card is dealt.
vi.mock("../../lib/cards/deck-content", () => ({
  deckHasContent: hoisted.deckHasContent,
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
    viewMode: () => "text" as ViewMode,
    setViewMode: vi.fn(),
  };
}

/** Render and wait for the deck to be dealt — deck-content is an async read,
 *  so the table paints its loading face first. */
async function renderReadingTable(activeTab: ProfileTab, ctx?: ProfileContextValue) {
  const utils = render(() => (
    <MemoryRouter>
      <Route
        path="/*"
        component={() => (
          <ProfileContext.Provider value={ctx ?? profileContext(activeTab)}>
            <ReadingTable />
          </ProfileContext.Provider>
        )}
      />
    </MemoryRouter>
  ));
  await waitFor(() => expect(hoisted.deckHasContent).toHaveBeenCalled());
  await waitFor(() =>
    expect(document.querySelector(".reading-table .card-loading-face, .deck-back-loading")).toBeNull(),
  );
  return utils;
}

beforeEach(() => {
  hoisted.registry.splice(0);
  hoisted.getStats.mockReset();
  hoisted.getStats.mockResolvedValue(null);
  hoisted.deckHasContent.mockReset();
  hoisted.deckHasContent.mockResolvedValue(true);
});

describe("ReadingTable panes", () => {
  it("renders all registry-visible panes in the tree", async () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="scouting-pane">Scouting body</div>),
      pane("narratives", "Narratives", () => <div data-testid="narratives-pane">Narratives body</div>),
      pane("transfers", "Transfers", () => <div data-testid="transfers-pane">Transfers body</div>),
    );

    await renderReadingTable("scouting");

    expect(screen.getByTestId("scouting-pane")).toBeTruthy();
    expect(screen.getByTestId("narratives-pane")).toBeTruthy();
    expect(screen.getByTestId("transfers-pane")).toBeTruthy();
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(3);
  });

  it("labels the Transfers tab with the sport-aware noun (NBA → Trades)", async () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("transfers", "Transfers", () => <div>Transfers body</div>),
    );

    await renderReadingTable("scouting");

    expect(screen.getByRole("tab", { name: "Trades" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Transfers" })).toBeNull();
  });

  it("deals every pane as a card slot: peeked cards carry bring-forward buttons with character-card labels", async () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("vibe", "Vibe", () => <div>Vibe body</div>),
      pane("sigil", "Sigil", () => <div>Sigil body</div>),
    );

    await renderReadingTable("scouting");

    // Peeked panes: bring-forward button interactive, face aria-hidden + inert.
    expect(
      screen.getByRole("button", { name: "Bring the Vibe card forward — The Influencer" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Bring the Sigil card forward — the Oracle" }),
    ).toBeTruthy();
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(3);
    const hiddenFaces = panels.filter((p) => p.getAttribute("aria-hidden") === "true");
    expect(hiddenFaces).toHaveLength(2);
    for (const face of hiddenFaces) expect(face.hasAttribute("inert")).toBe(true);

    // The top pane: face exposed, its own bring-forward button out of
    // reach (inert) — the top card is picked up, not brought forward.
    const activeFace = panels.find((p) => p.getAttribute("aria-hidden") !== "true")!;
    expect(activeFace.hasAttribute("inert")).toBe(false);
    expect(activeFace.textContent).toContain("Scouting body");
    const activeBring = document.querySelector(
      'button[aria-label="Bring the Scouting card forward — The Scout"]',
    )!;
    expect(activeBring.getAttribute("aria-hidden")).toBe("true");
    expect(activeBring.hasAttribute("inert")).toBe(true);
  });

  it("brings a card forward through the same setActiveTab the rail uses", async () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("momentum", "Momentum", () => <div>Momentum body</div>),
    );

    const ctx = profileContext("scouting");
    await renderReadingTable("scouting", ctx);

    fireEvent.click(
      screen.getByRole("button", { name: "Bring the Momentum card forward — The Analyst" }),
    );
    expect(ctx.setActiveTab).toHaveBeenCalledWith("momentum");
  });

  it("contains a hidden pane error without replacing the active pane", async () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="active-pane">Active scouting</div>),
      pane("momentum", "Momentum", () => {
        throw new Error("fixture momentum outage");
      }),
    );

    await renderReadingTable("scouting");

    expect(screen.getByTestId("active-pane").textContent).toBe("Active scouting");
    expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("Couldn't load Momentum.");
    expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("fixture momentum outage");
  });
});

describe("ReadingTable deck navigation", () => {
  async function deckSetup(activeTab: ProfileTab) {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("vibe", "Vibe", () => <div>Vibe body</div>),
      pane("sigil", "Sigil", () => <div>Sigil body</div>),
    );
    const ctx = profileContext(activeTab);
    await renderReadingTable(activeTab, ctx);
    const stage = document.querySelector<HTMLElement>(".deck-stage")!;
    return { ctx, stage };
  }

  /** One horizontal touch across the stage: press, release. */
  function swipe(stage: HTMLElement, dx: number, dy = 0) {
    fireEvent.touchStart(stage, { changedTouches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] });
  }

  it("steps through the deck with the arrows, naming the card each one turns to", async () => {
    const { ctx } = await deckSetup("vibe");

    const prev = screen.getByRole("button", { name: "Previous card: Scouting — The Scout" });
    const next = screen.getByRole("button", { name: "Next card: Sigil — the Oracle" });

    fireEvent.click(next);
    expect(ctx.setActiveTab).toHaveBeenCalledWith("sigil");
    fireEvent.click(prev);
    expect(ctx.setActiveTab).toHaveBeenCalledWith("scouting");
  });

  it("bounds the deck at both ends, and the spent arrow leaves rather than greying out", async () => {
    await deckSetup("scouting");

    // The pile is bounded — tab order is the registry's order. At an end
    // the arrow is hidden outright: a greyed-out one reads as broken.
    const prev = document.querySelector<HTMLButtonElement>(".deck-step.is-spent")!;
    expect(prev.getAttribute("aria-label")).toBe("Previous card");
    expect(prev.disabled).toBe(true);
    expect(document.querySelectorAll(".deck-step.is-spent")).toHaveLength(1);

    const next = screen.getByRole("button", { name: "Next card: Vibe — The Influencer" });
    expect(next).toHaveProperty("disabled", false);
    expect(next.classList.contains("is-spent")).toBe(false);
  });

  it("turns the deck on a horizontal swipe, in the direction the finger moved", async () => {
    const { ctx, stage } = await deckSetup("vibe");

    swipe(stage, -90);
    expect(ctx.setActiveTab).toHaveBeenCalledWith("sigil");

    swipe(stage, 90);
    expect(ctx.setActiveTab).toHaveBeenCalledWith("scouting");
  });

  it("leaves short drags and vertical scrolls alone", async () => {
    const { ctx, stage } = await deckSetup("vibe");

    swipe(stage, -16); // under the commit threshold — a tap that wandered
    expect(ctx.setActiveTab).not.toHaveBeenCalled();

    // Mostly vertical: the page is scrolling, and the deck stays out of it.
    swipe(stage, 20, 100);
    expect(ctx.setActiveTab).not.toHaveBeenCalled();
  });

  it("keeps its hands off the deck while a card is lifted", async () => {
    const { ctx, stage } = await deckSetup("vibe");
    const face = document.querySelector<HTMLElement>(".reading-table-pane.active .pane-face")!;

    fireEvent.click(face); // pick the card up
    expect(document.querySelector(".reading-table-pane.lifted")).toBeTruthy();

    swipe(stage, -90);
    expect(ctx.setActiveTab).not.toHaveBeenCalled();
  });
});

describe("ReadingTable lift (pick up the card)", () => {
  async function liftSetup() {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => (
        <div>
          Scouting body
          <button type="button" data-testid="inner-button">Copy</button>
        </div>
      )),
      pane("sigil", "Sigil", () => <div>Sigil body</div>),
    );
    const utils = await renderReadingTable("scouting");
    const face = document.querySelector<HTMLElement>(".reading-table-pane.active .pane-face")!;
    return { ...utils, face, paneEl: face.closest(".reading-table-pane")! };
  }

  it("lifts from the card surface: dialog semantics, scroll lock, the rest of the table inert", async () => {
    const { face, paneEl } = await liftSetup();

    fireEvent.click(face);

    expect(paneEl.classList.contains("lifted")).toBe(true);
    expect(face.getAttribute("role")).toBe("dialog");
    expect(face.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(face);
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.querySelector(".pane-lift-backdrop")!.classList.contains("open")).toBe(true);
    // Back dismisses on mobile: the lift pushed one same-URL entry.
    expect(window.history.state?.scoracleLift).toBe(true);
    // The modal claim is enforced: the sibling pane and the rail go inert.
    const siblingPane = document.querySelectorAll(".reading-table-pane")[1];
    expect(siblingPane.hasAttribute("inert")).toBe(true);
    expect(document.querySelector(".nav-well")!.hasAttribute("inert")).toBe(true);
    // All SSR'd bodies stay in the DOM under the lift.
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(1);
    expect(face.textContent).toContain("Scouting body");
  });

  it("does not lift from interactive targets inside the card", async () => {
    const { paneEl } = await liftSetup();

    fireEvent.click(screen.getByTestId("inner-button"));

    expect(paneEl.classList.contains("lifted")).toBe(false);
  });

  it("Esc sets the card down, restoring focus, scroll, and the page", async () => {
    const { face, paneEl } = await liftSetup();
    const innerButton = screen.getByTestId("inner-button");
    innerButton.focus();

    fireEvent.click(face);
    expect(document.activeElement).toBe(face);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(paneEl.classList.contains("lifted")).toBe(false);
    expect(face.getAttribute("role")).toBe("tabpanel");
    expect(face.hasAttribute("aria-modal")).toBe(false);
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
    expect(document.querySelectorAll(".reading-table-pane")[1].hasAttribute("inert")).toBe(false);
    expect(document.querySelector(".nav-well")!.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(innerButton);
    // The pane stays raised (.settling) while the card animates home.
    expect(paneEl.classList.contains("settling")).toBe(true);
  });

  it("backdrop click sets the card down", async () => {
    const { face, paneEl } = await liftSetup();

    fireEvent.click(face);
    fireEvent.click(document.querySelector(".pane-lift-backdrop")!);

    expect(paneEl.classList.contains("lifted")).toBe(false);
    expect(document.querySelector(".pane-lift-backdrop")!.classList.contains("open")).toBe(false);
  });

  it("clicking the lifted card's surface does not set it down", async () => {
    const { face, paneEl } = await liftSetup();

    fireEvent.click(face);
    fireEvent.click(face);

    expect(paneEl.classList.contains("lifted")).toBe(true);
  });

});

describe("ReadingTable controls", () => {
  it("fails profile stat-backed controls closed without replacing panes", async () => {
    hoisted.getStats.mockRejectedValue(new Error("fixture controls outage"));
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="active-pane">Active scouting</div>, ["season"]),
      pane("narratives", "Narratives", () => <div>Narratives body</div>),
    );

    await renderReadingTable("scouting");

    expect(screen.getByTestId("active-pane").textContent).toBe("Active scouting");
    await waitFor(() => expect(hoisted.getStats).toHaveBeenCalled());
    expect(screen.queryByText("fixture controls outage")).toBeNull();
  });

  it("renders the shared news scope as a Select control, not an item rail", async () => {
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div>Scouting body</div>),
      pane("narratives", "Narratives", () => <div>Narratives body</div>, ["newsScope"]),
    );

    await renderReadingTable("narratives");

    const controls = screen.getByRole("group", { name: "Profile view controls" });
    expect(screen.getByRole("button", { name: "News scope" })).toBeTruthy();
    expect(controls.querySelector("[role='tablist']")).toBeNull();
  });

  it("offers the chart cards' text/chart flip through the shared conditions line", async () => {
    hoisted.registry.push(
      pane("momentum", "Momentum", () => <div>Momentum body</div>, ["view"]),
    );
    const ctx = profileContext("momentum");

    await renderReadingTable("momentum", ctx);

    fireEvent.click(screen.getByRole("button", { name: /View/ }));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Chart" }));
    expect(ctx.setViewMode).toHaveBeenCalledWith("chart");
  });
});

describe("ReadingTable dealt deck", () => {
  /** Deal from a live set, so a fixture can empty a card mid-test the way a
   *  conditions change does. Read synchronously inside the mock, which runs
   *  in the deck's reactive scope. */
  function dealFrom(held: () => ProfileTab[]) {
    hoisted.deckHasContent.mockImplementation((_ctx: unknown, deck: ProfileTab) =>
      Promise.resolve(held().includes(deck)),
    );
  }

  /** A context whose active tab is a real signal — setActiveTab moves it, the
   *  way the URL does in the route. */
  function liveContext(initial: ProfileTab) {
    const [tab, setTab] = createSignal<ProfileTab>(initial);
    const setActiveTab = vi.fn((next: ProfileTab) => setTab(() => next));
    return { ...profileContext(initial), activeTab: tab, setActiveTab };
  }

  const threeCardRegistry = () =>
    hoisted.registry.push(
      pane("scouting", "Scouting", () => <div data-testid="scouting-pane">Scouting body</div>),
      pane("narratives", "Narratives", () => <div data-testid="narratives-pane">Narratives body</div>),
      pane("sigil", "Sigil", () => <div data-testid="sigil-pane">Sigil body</div>),
    );

  it("deals only the cards the entity holds — no tab, no pane for the rest", async () => {
    threeCardRegistry();
    dealFrom(() => ["scouting", "sigil"]);

    await renderReadingTable("scouting");

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("tab", { name: "Narratives" })).toBeNull();
    expect(screen.queryByTestId("narratives-pane")).toBeNull();
    expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(2);
  });

  it("leaves the desk to the meta card when the entity holds nothing", async () => {
    threeCardRegistry();
    dealFrom(() => []);

    await renderReadingTable("scouting");

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(document.querySelector(".nav-well")).toBeNull();
    expect(document.querySelector(".reading-table-deck")).toBeNull();
    expect(document.querySelector(".reading-table")!.children).toHaveLength(0);
  });

  it("lands a deep link to an unheld card on the first card the entity does hold", async () => {
    threeCardRegistry();
    dealFrom(() => ["narratives", "sigil"]);
    const ctx = liveContext("scouting");

    await renderReadingTable("scouting", ctx);

    // The table deals what it has, and the URL is corrected to match it.
    const active = document.querySelector(".reading-table-pane.active")!;
    expect(active.textContent).toContain("Narratives body");
    await waitFor(() => expect(ctx.setActiveTab).toHaveBeenCalledWith("narratives"));
  });

  it("keeps the card in hand on the table when its conditions empty it", async () => {
    threeCardRegistry();
    const [held, setHeld] = createSignal<ProfileTab[]>(["scouting", "narratives", "sigil"]);
    dealFrom(held);
    const ctx = liveContext("narratives");

    await renderReadingTable("narratives", ctx);
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    // The Journalist runs dry under the newly chosen scope: the card being
    // read shows its Veil rather than vanishing mid-turn.
    setHeld(["scouting", "sigil"]);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(3));
    expect(screen.getByRole("tab", { name: "Narratives" })).toBeTruthy();
    expect(ctx.setActiveTab).not.toHaveBeenCalled();

    // …and leaves the table once the reader moves on.
    fireEvent.click(screen.getByRole("tab", { name: "Sigil" }));
    await waitFor(() => expect(screen.queryByRole("tab", { name: "Narratives" })).toBeNull());
  });
});
