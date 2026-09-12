import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { profileSky } from "./profile-sky";

describe("Profile sky", () => {
  it("follows the existing five score bands grouped into three skies", () => {
    for (const type of ["player", "team"] as const) {
      for (const score of [0, 20, 40]) expect(profileSky(score, type)).toBe("moon");
      for (const score of [41, 50, 60]) expect(profileSky(score, type)).toBe("clouds");
      for (const score of [61, 80, 99]) expect(profileSky(score, type)).toBe("sun");
      for (const score of [null, undefined, NaN, Infinity]) expect(profileSky(score, type)).toBeNull();
    }
  });
  it("keeps all three engraving assets available", () => {
    for (const sky of ["moon", "clouds", "sun"]) {
      expect(existsSync(`public/deck-art/engraving-profile-${sky}-v1.webp`)).toBe(true);
    }
  });
});
