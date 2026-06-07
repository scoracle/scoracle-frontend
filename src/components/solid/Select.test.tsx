import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import Select from "./Select";

const OPTIONS = [
  { value: "all", label: "All" },
  { value: "position", label: "By Position" },
  { value: "conference", label: "By Conference" },
];

describe("Select", () => {
  it("shows the resolved option's label on the trigger", () => {
    render(() => <Select options={OPTIONS} value="position" onChange={() => {}} ariaLabel="Scope" />);
    expect(screen.getByRole("button", { name: "Scope" }).textContent).toContain("By Position");
  });

  it("falls back to the first option when value is unknown", () => {
    render(() => <Select options={OPTIONS} value="nope" onChange={() => {}} ariaLabel="Scope" />);
    expect(screen.getByRole("button", { name: "Scope" }).textContent).toContain("All");
  });

  it("opens on trigger click and lists all options", () => {
    render(() => <Select options={OPTIONS} value="all" onChange={() => {}} ariaLabel="Scope" />);
    const trigger = screen.getByRole("button", { name: "Scope" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("commits a clicked option, fires onChange, and closes", () => {
    const onChange = vi.fn();
    render(() => <Select options={OPTIONS} value="all" onChange={onChange} ariaLabel="Scope" />);
    fireEvent.click(screen.getByRole("button", { name: "Scope" }));
    fireEvent.mouseDown(screen.getByRole("option", { name: "By Conference" }));
    expect(onChange).toHaveBeenCalledWith("conference");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("does not fire onChange when the current value is re-selected", () => {
    const onChange = vi.fn();
    render(() => <Select options={OPTIONS} value="all" onChange={onChange} ariaLabel="Scope" />);
    fireEvent.click(screen.getByRole("button", { name: "Scope" }));
    fireEvent.mouseDown(screen.getByRole("option", { name: "All" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keyboard: ArrowDown opens, navigates, Enter commits", () => {
    const onChange = vi.fn();
    render(() => <Select options={OPTIONS} value="all" onChange={onChange} ariaLabel="Scope" />);
    const trigger = screen.getByRole("button", { name: "Scope" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // opens, highlight on selected (idx 0)
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // -> idx 1
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("position");
  });

  it("closes on outside mousedown", () => {
    render(() => <Select options={OPTIONS} value="all" onChange={() => {}} ariaLabel="Scope" />);
    fireEvent.click(screen.getByRole("button", { name: "Scope" }));
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
