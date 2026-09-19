import { flush } from "solid-js";
import { cleanup, render } from "../../../tests/render";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import PageAtmosphere, { type AtmospherePalette } from "./PageAtmosphere";

afterEach(cleanup);

describe("PageAtmosphere", () => {
  it("keeps the default drapes decorative and uses one composition at every size", () => {
    const { container } = render(() => <PageAtmosphere />);
    const wash = container.querySelector(".page-atmosphere")!;
    expect(wash.getAttribute("aria-hidden")).toBe("true");
    expect(wash.hasAttribute("tabindex")).toBe(false);
    expect(wash.querySelector("source")).toBeNull();
    expect([...wash.querySelectorAll("img")].map(img => img.getAttribute("src")))
      .toEqual(Array(2).fill("/images/impasto-drapes-threaded-default-4.webp"));
    expect(wash.classList.contains("page-atmosphere--team")).toBe(false);
    expect(wash.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(wash.querySelector("img")?.getAttribute("src")).toBe("/images/impasto-drapes-threaded-default-4.webp");
    expect(wash.querySelector("filter")).toBeNull();
    expect(wash.querySelector("img")?.getAttribute("style")).toBeNull();
  });

  it("updates both colors on entity navigation and clears a missing palette", () => {
    const [palette, setPalette] = createSignal<AtmospherePalette | undefined>(["#006400", "#ffffff"]);
    const { container } = render(() => <PageAtmosphere palette={palette()} />);
    const wash = container.querySelector<HTMLElement>(".page-atmosphere")!;
    expect(wash.querySelector<SVGElement>(".page-atmosphere-filters")?.style.getPropertyValue("--wash-primary")).toBe("#006400");
    expect(wash.querySelector("img")?.getAttribute("src")).toBe("/images/impasto-drapes-threaded-3.webp");
    setPalette(["#ff0000", "#000000"]); flush();
    expect(wash.querySelector<SVGElement>(".page-atmosphere-filters")?.style.getPropertyValue("--wash-primary")).toBe("#ff0000");
    expect(wash.querySelector<SVGElement>(".page-atmosphere-filters")?.style.getPropertyValue("--wash-secondary")).toBe("#000000");
    setPalette(undefined); flush();
    expect(wash.classList.contains("page-atmosphere--team")).toBe(false);
    expect(wash.querySelector("filter")).toBeNull();
    expect(wash.querySelector("img")?.getAttribute("src")).toBe("/images/impasto-drapes-threaded-default-4.webp");
    expect(wash.querySelector("img")?.getAttribute("style")).toBeNull();
    setPalette(["#0E2240", "#FEC524"]); flush();
    expect(wash.querySelector('[result="primary"]')).not.toBeNull();
    expect(wash.querySelector("img")?.getAttribute("src")).toBe("/images/impasto-drapes-threaded-3.webp");
    expect(wash.querySelector("img")?.style.filter).toBe(`url(#${wash.querySelector("filter")!.id})`);
  });

  it("tints each fabric panel while preserving fold luminance and the transparent opening", () => {
    const { container } = render(() => <PageAtmosphere palette={["#0E2240", "#FEC524"]} />);
    const filter = container.querySelector("filter")!;
    expect(filter.querySelector('[result="neutral"]')?.getAttribute("values")).toBe("0");
    for (const [color, start] of [["primary", "0"], ["secondary", "50%"]]) {
      const tint = filter.querySelector(`[result="${color}"]`)!;
      expect(tint.getAttribute("x")).toBe(start);
      expect(tint.getAttribute("width")).toBe("50%");
      expect(tint.getAttribute("height")).toBe("100%");
    }
    expect([...filter.querySelectorAll("feMergeNode")].map(node => node.getAttribute("in")))
      .toEqual(["primary", "secondary"]);
    const blend = filter.querySelector('[result="tintedTexture"]')!;
    expect(blend.getAttribute("in")).toBe("palette");
    expect(blend.getAttribute("in2")).toBe("neutral");
    expect(blend.getAttribute("mode")).toBe("multiply");
    expect(filter.lastElementChild?.getAttribute("in")).toBe("tintedTexture");
    expect(filter.lastElementChild?.getAttribute("in2")).toBe("SourceAlpha");
    expect(filter.lastElementChild?.getAttribute("operator")).toBe("in");
    expect(container.querySelector("img")?.style.filter).toBe(`url(#${filter.id})`);
  });

  it("keeps filter references unique between instances", () => {
    const { container } = render(() => <>
      <PageAtmosphere palette={["#003594", "#FFD100"]} />
      <PageAtmosphere palette={["#0E2240", "#FEC524"]} />
    </>);
    const filters = [...container.querySelectorAll("filter")];
    expect(new Set(filters.map(filter => filter.id)).size).toBe(2);
  });
});
