import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import ScopeStrip from "./ScopeStrip";

describe("ScopeStrip", () => {
  it("renders its controls inside a labelled group row", () => {
    render(() => (
      <ScopeStrip ariaLabel="View controls">
        <button>scope</button>
        <button>season</button>
      </ScopeStrip>
    ));
    const group = screen.getByRole("group", { name: "View controls" });
    expect(group.classList.contains("scope-strip")).toBe(true);
    expect(group.querySelectorAll("button")).toHaveLength(2);
  });
});
