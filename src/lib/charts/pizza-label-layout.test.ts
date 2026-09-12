import { describe, expect, it } from "vitest";
import { pizzaLabelRadius } from "./pizza-label-layout";
import { sliceRadius } from "./arc-math";

describe("pizza label breathing room", () => {
  it("increases the tip gap as a slice shrinks, without changing slice values", () => {
    for (const outer of [60, 100, 180]) {
      let previousGap = Infinity;
      for (let percentile = 0; percentile <= 100; percentile++) {
        const tip = sliceRadius(percentile, 0, outer);
        const label = pizzaLabelRadius(percentile, 0, outer, 14);
        expect(label - tip).toBeLessThanOrEqual(previousGap + 1e-9);
        expect(label).toBeGreaterThanOrEqual(outer * 0.6 + 14);
        previousGap = label - tip;
      }
      expect(previousGap).toBeCloseTo(14);
    }
  });
  it("clamps out-of-range percentiles and supports an inner radius", () => {
    expect(pizzaLabelRadius(-10, 20, 100, 14)).toBe(82);
    expect(pizzaLabelRadius(120, 20, 100, 14)).toBe(114);
  });
});
