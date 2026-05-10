import { describe, it, expect } from "vitest";
import { ARCHETYPES, scoreToArchetype } from "./archetypes";

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
