import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import NavRailStack from "./NavRailStack";

describe("NavRailStack", () => {
  const items = [
    { id: "rating", label: "Rating" },
    { id: "news", label: "News" },
  ] as const;

  it("renders an item rail plus an optional control rail", () => {
    render(() => (
      <NavRailStack
        items={items}
        active="rating"
        onSelect={vi.fn()}
        ariaLabel="Select board"
        controlsAriaLabel="Board controls"
        controls={<button>Season</button>}
      />
    ));

    expect(screen.getByRole("tablist", { name: "Select board" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Board controls" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Season" })).toBeTruthy();
  });

  it("omits the control rail when no controls are provided", () => {
    render(() => (
      <NavRailStack
        items={items}
        active="rating"
        onSelect={vi.fn()}
        ariaLabel="Select board"
      />
    ));

    expect(screen.getByRole("tablist", { name: "Select board" })).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });
});
