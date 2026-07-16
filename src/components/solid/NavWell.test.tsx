import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import NavWell from "./NavWell";

describe("NavWell", () => {
  const items = [
    { id: "stats", label: "Stats" },
    { id: "news", label: "News" },
  ] as const;

  it("renders a labelled tablist with aria-selected on the active tab", () => {
    const onSelect = vi.fn();
    render(() => (
      <NavWell
        ariaLabel="Profile section"
        items={items}
        active="stats"
        onSelect={onSelect}
      />
    ));

    const rail = screen.getByRole("tablist", { name: "Profile section" });
    expect(rail.classList.contains("nav-well-rail")).toBe(true);
    expect(screen.getByRole("tab", { name: "Stats" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "News" }).getAttribute("aria-selected")).toBe("false");

    fireEvent.click(screen.getByRole("tab", { name: "News" }));
    expect(onSelect).toHaveBeenCalledWith("news");
  });

  it("renders the marker as presentation-only chrome", () => {
    const { container } = render(() => (
      <NavWell items={items} active="stats" onSelect={vi.fn()} ariaLabel="Profile section" />
    ));

    const marker = container.querySelector(".nav-well-marker");
    expect(marker).toBeTruthy();
    expect(marker?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the conditions row as a labelled group when provided", () => {
    render(() => (
      <NavWell
        items={items}
        active="stats"
        onSelect={vi.fn()}
        ariaLabel="Select board"
        conditionsAriaLabel="Board conditions"
        conditions={<button>Season</button>}
      />
    ));

    expect(screen.getByRole("group", { name: "Board conditions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Season" })).toBeTruthy();
  });

  it("omits the conditions row when none are provided", () => {
    render(() => (
      <NavWell items={items} active="stats" onSelect={vi.fn()} ariaLabel="Select board" />
    ));

    expect(screen.queryByRole("group")).toBeNull();
  });
});
