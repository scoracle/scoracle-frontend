import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("translucent screen surfaces", () => {
  it("defines resting and hover films, with separate card ink", () => {
    const css = readFileSync("src/global.css", "utf8");
    expect(css).toContain("--surface-screen: color-mix(in srgb, var(--surface-staging) 82%, transparent)");
    expect(css).toContain("--surface-hover: color-mix(in srgb, var(--surface-staging) 56%, transparent)");
    expect(css).toContain("--surface-hover: color-mix(in srgb, var(--text) 6%, transparent)");
    const combinedCoverage = 0.82 + (1 - 0.82) * 0.56;
    expect(combinedCoverage).toBeGreaterThan(0.82);
    expect(combinedCoverage).toBeLessThan(1);
  });

  it("uses the same hover film across tray, search, select, compare and card actions", () => {
    for (const file of ["AppTray", "SearchBar", "Select", "CompareSearch", "CopyCardButton"]) {
      const css = readFileSync(`src/components/solid/${file}.css`, "utf8");
      expect(css, file).toContain("var(--surface-hover)");
      const hoverRules = css.match(/[^{}]*:hover[^{}]*\{[^{}]*\}/g) ?? [];
      for (const rule of hoverRules) {
        expect(rule, file).not.toMatch(/background(?:-color)?:\s*var\(--surface-active/);
      }
    }
  });
});
