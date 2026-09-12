import { render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import PizzaChart from "./PizzaChart";

afterEach(() => vi.unstubAllGlobals());

describe("PizzaChart fits its card cell", () => {
  it("keeps metric names inside narrow and full-width measured cells", () => {
    for (const width of [240, 300, 374]) {
      const height = Math.round(width * 1.2);
      vi.stubGlobal("ResizeObserver", class {
        constructor(private callback: (entries: unknown[]) => void) {}
        observe() { this.callback([{ contentRect: { width, height } }]); }
        disconnect() {}
      });
      for (const values of [[0, 6, 10, 21, 40, 82, 90, 100], Array(8).fill(0)]) {
        const names = ["xG For", "Creation", "Cards", "Clean Sheets", "Goals Against", "Goals For", "Tackling", "xG Against"];
        const { container, unmount } = render(() => <PizzaChart stats={names.map((label, i) => ({
          key: label, label, value: 0, percentile: values[i],
        }))} />);
        expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(`${-width / 2} ${-height / 2} ${width} ${height}`);
        for (const label of container.querySelectorAll(".pizza-slice-label")) {
          const x = Number(label.getAttribute("x"));
          const y = Number(label.getAttribute("y"));
          const textWidth = (label.textContent?.length ?? 0) * 13 * 0.55;
          const reach = label.getAttribute("text-anchor") === "middle" ? textWidth / 2 : textWidth;
          expect(Math.abs(x) + reach).toBeLessThanOrEqual(width / 2 - 7.9);
          expect(Math.abs(y)).toBeLessThan(height / 2 - 8);
        }
        unmount();
      }
    }
  });
});
