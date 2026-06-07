import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import Disclosure from "./Disclosure";

function Harness() {
  return (
    <Disclosure ariaLabel="Menu" haspopup="menu" trigger={() => <span>open</span>}>
      {(api) => (
        <div role="menu" id={api.panelId}>
          <button onClick={() => api.close()}>close</button>
        </div>
      )}
    </Disclosure>
  );
}

describe("Disclosure", () => {
  it("renders the panel only while open and wires aria", () => {
    render(() => <Harness />);
    const trigger = screen.getByRole("button", { name: "Menu" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByRole("menu");
    expect(panel.id).toBe(trigger.getAttribute("aria-controls"));
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(() => <Harness />);
    const trigger = screen.getByRole("button", { name: "Menu" }) as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeTruthy();
    // keydown bubbles from the document to the window listener registered while open
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes via the api passed to panel content", () => {
    render(() => <Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
