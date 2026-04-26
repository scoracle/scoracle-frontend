import { describe, it, expect } from "vitest";
import { normalizeForSearch } from "./search-normalize";

describe("normalizeForSearch", () => {
  it("strips diacritics from European accents", () => {
    expect(normalizeForSearch("Estêvão")).toBe("estevao");
    expect(normalizeForSearch("Aarón Martín")).toBe("aaron martin");
    expect(normalizeForSearch("José María")).toBe("jose maria");
  });

  it("lowercases ASCII", () => {
    expect(normalizeForSearch("LeBron James")).toBe("lebron james");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeForSearch("  Steph Curry  ")).toBe("steph curry");
  });

  it("returns empty string for null/undefined/empty input", () => {
    expect(normalizeForSearch(null)).toBe("");
    expect(normalizeForSearch(undefined)).toBe("");
    expect(normalizeForSearch("")).toBe("");
  });

  it("preserves the German sharp-s (no NFD decomposition)", () => {
    // sharp-s has no decomposition; it stays as-is. Documenting current behavior.
    expect(normalizeForSearch("Straße")).toBe("straße");
  });

  it("preserves internal spacing (does not collapse multiple spaces)", () => {
    // The function trims edges and lowercases; internal spaces are passed through.
    expect(normalizeForSearch("Patrick   Mahomes")).toBe("patrick   mahomes");
  });
});
