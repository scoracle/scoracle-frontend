import { describe, it, expect } from "vitest";
import { ARCHETYPES, VEIL_ARCHETYPE, scoreToArchetype } from "./archetypes";

describe("ARCHETYPES", () => {
  it("contains exactly eleven major arcana", () => {
    expect(ARCHETYPES).toHaveLength(11);
  });

  it("covers the full 1-100 range without gaps or overlaps", () => {
    for (let score = 1; score <= 100; score++) {
      const matches = ARCHETYPES.filter((a) => score >= a.min && score <= a.max);
      expect(matches).toHaveLength(1);
    }
  });

  it("is sorted score-descending so scoreToArchetype's top-down scan works", () => {
    for (let i = 1; i < ARCHETYPES.length; i++) {
      expect(ARCHETYPES[i].max).toBeLessThan(ARCHETYPES[i - 1].min);
    }
  });
});

describe("scoreToArchetype", () => {
  it("returns the right archetype at boundary values", () => {
    expect(scoreToArchetype(100)?.name).toBe("The World");
    expect(scoreToArchetype(95)?.name).toBe("The World");
    expect(scoreToArchetype(94)?.name).toBe("The Sun");
    expect(scoreToArchetype(85)?.name).toBe("The Sun");
    expect(scoreToArchetype(84)?.name).toBe("The Star");
    expect(scoreToArchetype(50)?.name).toBe("Temperance");
    expect(scoreToArchetype(15)?.name).toBe("The Tower");
    expect(scoreToArchetype(14)?.name).toBe("Death");
    expect(scoreToArchetype(5)?.name).toBe("Death");
    expect(scoreToArchetype(4)?.name).toBe("The Devil");
    expect(scoreToArchetype(1)?.name).toBe("The Devil");
  });

  it("returns the right numeral for the famous bands", () => {
    expect(scoreToArchetype(90)?.numeral).toBe("XIX");
    expect(scoreToArchetype(20)?.numeral).toBe("XVI");
    expect(scoreToArchetype(10)?.numeral).toBe("XIII");
  });

  it("returns null for scores outside 1-100", () => {
    expect(scoreToArchetype(0)).toBeNull();
    expect(scoreToArchetype(-1)).toBeNull();
    expect(scoreToArchetype(101)).toBeNull();
  });

  it("returns null for non-finite or null input", () => {
    expect(scoreToArchetype(null)).toBeNull();
    expect(scoreToArchetype(undefined)).toBeNull();
    expect(scoreToArchetype(NaN)).toBeNull();
    expect(scoreToArchetype(Infinity)).toBeNull();
  });
});

describe("VEIL_ARCHETYPE", () => {
  it("ships the expected slug + numeral so EmptyCard can render the asset", () => {
    expect(VEIL_ARCHETYPE.slug).toBe("the-veil");
    expect(VEIL_ARCHETYPE.numeral).toBe("0");
    expect(VEIL_ARCHETYPE.name).toBe("The Veil");
  });

  it("is not in the ARCHETYPES score-band list (the 11 major arcana are the bands)", () => {
    expect(ARCHETYPES).not.toContain(VEIL_ARCHETYPE);
  });

  it("uses a sentinel range that scoreToArchetype cannot match", () => {
    // The sentinel (-1, -1) sits outside the 1–100 score domain, so even
    // if the band scan ever reached it, no real score would match.
    expect(VEIL_ARCHETYPE.min).toBeLessThan(1);
    expect(VEIL_ARCHETYPE.max).toBeLessThan(1);
  });
});
