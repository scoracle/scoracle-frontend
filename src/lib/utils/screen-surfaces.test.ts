import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

describe("translucent screen surfaces", () => {
  it("defines resting and hover films, with separate card ink", () => {
    const css = readFileSync("src/global.css", "utf8");
    expect(css).toContain("--surface-screen: color-mix(in srgb, var(--screen-tint) var(--screen-opacity), transparent)");
    expect(css).toContain("--surface-hover: color-mix(in srgb, var(--screen-hover-tint) var(--screen-hover-opacity), transparent)");
    expect(css).toContain("--surface-hover: color-mix(in srgb, var(--text) 6%, transparent)");
    const { light, dark } = createRequire(import.meta.url)("@scoracle/tokens");
    expect(light.screenTint).toBe("#1E1D1B");
    expect(light.screenOpacity).toBe("50%");
    expect(light.screenInk).toBe("#EAE7E1");
    expect(dark.screenTint).toBe("#161513");
    expect(dark.screenOpacity).toBe("82%");
    for (const theme of [light, dark]) {
      expect(theme.screenBlur).toBe("8px");
      const resting = parseFloat(theme.screenOpacity) / 100;
      const hover = parseFloat(theme.screenHoverOpacity) / 100;
      const combinedCoverage = resting + (1 - resting) * hover;
      expect(combinedCoverage).toBeGreaterThan(resting);
      expect(combinedCoverage).toBeLessThan(1);
    }
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
