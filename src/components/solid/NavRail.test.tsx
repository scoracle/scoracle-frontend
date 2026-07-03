import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import NavRail from "./NavRail";

describe("NavRail", () => {
  it("renders item rails as a labelled tablist", () => {
    const onSelect = vi.fn();
    render(() => (
      <NavRail
        ariaLabel="Profile section"
        items={[
          { id: "stats", label: "Stats" },
          { id: "news", label: "News" },
        ]}
        active="stats"
        onSelect={onSelect}
      />
    ));

    const rail = screen.getByRole("tablist", { name: "Profile section" });
    expect(rail.classList.contains("nav-rail-items")).toBe(true);
    expect(screen.getByRole("tab", { name: "Stats" }).classList.contains("active")).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "News" }));
    expect(onSelect).toHaveBeenCalledWith("news");
  });

  it("renders control rails as a labelled group row", () => {
    render(() => (
      <NavRail ariaLabel="View controls">
        <button>scope</button>
        <button>season</button>
      </NavRail>
    ));

    const group = screen.getByRole("group", { name: "View controls" });
    expect(group.classList.contains("nav-rail-controls")).toBe(true);
    expect(group.querySelectorAll("button")).toHaveLength(2);
  });
});
