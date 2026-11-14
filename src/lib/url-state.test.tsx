import { describe, it, expect } from "vitest";
import { createUrlState } from "./url-state";
import { render, screen, waitFor } from "../../tests/render";

function Probe() {
  const url = createUrlState("");
  const searchParams = () => new URLSearchParams(url.search());
  const setSearchParams = url.replaceAll;
  return (
    <div>
      <output data-testid="tab">{searchParams().get("tab") ?? "(none)"}</output>
      <output data-testid="season">{searchParams().get("season") ?? "(none)"}</output>
      <button onClick={() => setSearchParams({ tab: "news" })}>set-tab</button>
      <button onClick={() => setSearchParams({ tab: null })}>clear-tab</button>
      <button onClick={() => setSearchParams({ tab: "sigil", season: "2025" })}>set-both</button>
    </div>
  );
}

function renderProbe() {
  window.history.replaceState({}, "", "/");
  return render(() => <Probe />);
}

describe("native URL state", () => {
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
