import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { cardSky } from "./card-sky";

describe("Meaning-led card sky", () => {
  it("follows the existing five score bands grouped into three skies", () => {
    for (const type of ["player", "team"] as const) {
      for (const card of ["profile", "vibe"] as const) {
        for (const score of [0, 20, 40]) expect(cardSky(card, score, type)).toBe("moon");
        for (const score of [41, 50, 60]) expect(cardSky(card, score, type)).toBe("clouds");
        for (const score of [61, 80, 99]) expect(cardSky(card, score, type)).toBe("sun");
      }
    }
  });
  it("respects the Scout's different player and team score bands", () => {
    for (const score of [0, 34, 44]) expect(cardSky("scouting", score, "player")).toBe("moon");
    for (const score of [45, 50, 54]) expect(cardSky("scouting", score, "player")).toBe("clouds");
    for (const score of [55, 65, 99]) expect(cardSky("scouting", score, "player")).toBe("sun");
    expect(cardSky("scouting", 40, "team")).toBe("moon");
    expect(cardSky("scouting", 41, "team")).toBe("clouds");
    expect(cardSky("scouting", 60, "team")).toBe("clouds");
    expect(cardSky("scouting", 61, "team")).toBe("sun");
  });
  it("gives busyness a sunny middle, a cloudy quiet wire and a lunar storm", () => {
    for (const card of ["narratives", "transfers"] as const) {
      for (const type of ["player", "team"] as const) {
        for (const score of [0, 14, 15, 39]) expect(cardSky(card, score, type)).toBe("clouds");
        for (const score of [40, 55, 69]) expect(cardSky(card, score, type)).toBe("sun");
        for (const score of [70, 84, 85, 99]) expect(cardSky(card, score, type)).toBe("moon");
      }
    }
  });
  it("keeps missing scores blank and excludes Momentum, Sigil and the Board", () => {
    for (const card of ["profile", "scouting", "narratives", "transfers", "vibe"] as const) {
      for (const score of [null, undefined, NaN, Infinity, -Infinity]) expect(cardSky(card, score, "team")).toBeNull();
    }
    for (const card of ["momentum", "sigil", "leaderboard"] as const) {
      for (let score = 0; score <= 99; score++) expect(cardSky(card, score, "player")).toBeNull();
    }
  });
  it("uses the same rounded, clamped score as the numeral", () => {
    expect(cardSky("vibe", 40.49, "team")).toBe("moon");
    expect(cardSky("vibe", 40.5, "team")).toBe("clouds");
    expect(cardSky("vibe", -100, "team")).toBe("moon");
    expect(cardSky("vibe", 150, "team")).toBe("sun");
  });
  it("keeps all three engraving assets available", () => {
    for (const sky of ["moon", "clouds", "sun"]) {
      expect(existsSync(`public/deck-art/engraving-profile-${sky}-v1.webp`)).toBe(true);
    }
  });
});
