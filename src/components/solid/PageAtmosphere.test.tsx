import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import PageAtmosphere, { type AtmospherePalette } from "./PageAtmosphere";

afterEach(cleanup);

describe("PageAtmosphere", () => {
  it("keeps the shared wash decorative and outside the tab order", () => {
    const { container } = render(() => <PageAtmosphere />);
    const wash = container.querySelector(".page-atmosphere")!;
    expect(wash.getAttribute("aria-hidden")).toBe("true");
    expect(wash.hasAttribute("tabindex")).toBe(false);
    expect(wash.classList.contains("page-atmosphere--team")).toBe(false);
  });

  it("updates both colors on entity navigation and clears a missing palette", () => {
    const [palette, setPalette] = createSignal<AtmospherePalette | undefined>(["#006400", "#ffffff"]);
    const { container } = render(() => <PageAtmosphere palette={palette()} />);
    const wash = container.querySelector<HTMLElement>(".page-atmosphere")!;
    expect(wash.style.getPropertyValue("--wash-primary")).toBe("#006400");
    setPalette(["#ff0000", "#000000"]);
    expect(wash.style.getPropertyValue("--wash-primary")).toBe("#ff0000");
    expect(wash.style.getPropertyValue("--wash-secondary")).toBe("#000000");
    setPalette(undefined);
    expect(wash.classList.contains("page-atmosphere--team")).toBe(false);
    expect(wash.style.getPropertyValue("--wash-primary")).toBe("");
    expect(wash.style.getPropertyValue("--wash-secondary")).toBe("");
  });
});
