/**
 * Spike-turned-regression-test for the Phase 2 router unification: the
 * router's own `useSearchParams` must be reliably reactive (the custom
 * `useUrlSearchParams` hook existed because an earlier SolidStart alpha
 * desynced it). If this breaks on a framework upgrade, the URL-state
 * migration needs a second look before shipping.
 */
import { describe, it, expect } from "vitest";
import { MemoryRouter, Route, useSearchParams } from "@solidjs/router";
import { render, screen, waitFor } from "@solidjs/testing-library";
import { paramValue } from "./search-params";

function Probe() {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div>
      <output data-testid="tab">{paramValue(searchParams.tab) ?? "(none)"}</output>
      <output data-testid="season">{paramValue(searchParams.season) ?? "(none)"}</output>
      <button onClick={() => setSearchParams({ tab: "news" }, { replace: true })}>set-tab</button>
      <button onClick={() => setSearchParams({ tab: null })}>clear-tab</button>
      <button onClick={() => setSearchParams({ tab: "sigil", season: "2025" })}>set-both</button>
    </div>
  );
}

function renderProbe() {
  return render(() => (
    <MemoryRouter>
      <Route path="/*" component={Probe} />
    </MemoryRouter>
  ));
}

describe("router useSearchParams (Phase 2 spike)", () => {
  it("reads reactively: set, batch-set, and delete via null", async () => {
    renderProbe();
    expect(screen.getByTestId("tab").textContent).toBe("(none)");

    screen.getByText("set-tab").click();
    await waitFor(() => expect(screen.getByTestId("tab").textContent).toBe("news"));

    screen.getByText("set-both").click();
    await waitFor(() => expect(screen.getByTestId("tab").textContent).toBe("sigil"));
    expect(screen.getByTestId("season").textContent).toBe("2025");

    screen.getByText("clear-tab").click();
    await waitFor(() => expect(screen.getByTestId("tab").textContent).toBe("(none)"));
    // Untouched keys survive a partial set.
    expect(screen.getByTestId("season").textContent).toBe("2025");
  });
});

describe("paramValue", () => {
  it("normalizes router param shapes to a single string", () => {
    expect(paramValue(undefined)).toBeUndefined();
    expect(paramValue("")).toBeUndefined();
    expect(paramValue("news")).toBe("news");
    expect(paramValue(["news", "sigil"])).toBe("news");
    expect(paramValue([])).toBeUndefined();
  });
});
