import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import PageAtmosphere, { type AtmospherePalette } from "./PageAtmosphere";

afterEach(cleanup);

describe("PageAtmosphere", () => {
  it("keeps the drapes decorative and supplies a portrait composition", () => {
    const { container } = render(() => <PageAtmosphere />);
    const wash = container.querySelector(".page-atmosphere")!;
    expect(wash.getAttribute("aria-hidden")).toBe("true");
    expect(wash.hasAttribute("tabindex")).toBe(false);
    expect(wash.classList.contains("page-atmosphere--team")).toBe(false);
    expect(wash.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(wash.querySelector("source")?.getAttribute("media")).toBe("(max-width: 768px)");
    expect(wash.querySelector("source")?.getAttribute("srcset")).toBe("/images/impasto-drapes-threaded-mobile-3.webp");
    expect(wash.querySelector("img")?.getAttribute("src")).toBe("/images/impasto-drapes-threaded-3.webp");
    expect(wash.querySelector('[result="dustyBlue"]')).not.toBeNull();
    expect(wash.querySelector('[result="dustyMauve"]')).not.toBeNull();
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
    expect(wash.querySelector('[result="primary"]')).toBeNull();
    expect(wash.querySelector('[result="dustyMauve"]')).not.toBeNull();
    expect(wash.querySelector("img")?.style.filter).toBe(`url(#${wash.querySelector("filter")!.id})`);
    setPalette(["#0E2240", "#FEC524"]);
    expect(wash.querySelector('[result="dustyMauve"]')).toBeNull();
    expect(wash.querySelector('[result="primary"]')).not.toBeNull();
  });

  it("deepens blue and grades orange to mauve without changing artwork alpha", () => {
    const { container } = render(() => <PageAtmosphere />);
    const filter = container.querySelector("filter")!;
    const grade = (result: string, rgba: number[]) => {
      const matrix = filter.querySelector(`[result="${result}"]`)!.getAttribute("values")!
        .trim().split(/\s+/).map(Number);
      expect(matrix).toHaveLength(20);
      expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
      return Array.from({ length: 4 }, (_, row) => rgba.reduce(
        (sum, channel, col) => sum + channel * matrix[row * 5 + col], matrix[row * 5 + 4],
      ));
    };
    const blue = grade("dustyBlue", [0.4, 0.55, 0.7, 0.4]);
    expect(blue[0]).toBeCloseTo(0.36);
    expect(blue[1]).toBeCloseTo(0.495);
    expect(blue[2]).toBeCloseTo(0.63);
    expect(blue[3]).toBe(0.4);
    const mauve = grade("dustyMauve", [0.94, 0.7, 0.56, 0.6]);
    expect(mauve[0]).toBeCloseTo(0.7012);
    expect(mauve[1]).toBeCloseTo(0.5302);
    expect(mauve[2]).toBeCloseTo(0.658);
    expect(mauve[3]).toBe(0.6);
    expect(grade("dustyMauve", [0.94, 0.7, 0.56, 0])[3]).toBe(0);
    expect(filter.querySelector('[result="dustyBlue"]')?.getAttribute("x")).toBe("0");
    expect(filter.querySelector('[result="dustyMauve"]')?.getAttribute("x")).toBe("50%");
    for (const matrix of filter.querySelectorAll("feColorMatrix")) {
      expect(matrix.getAttribute("width")).toBe("50%");
    }
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
