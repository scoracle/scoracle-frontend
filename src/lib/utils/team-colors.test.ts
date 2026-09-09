import { describe, expect, it } from "vitest";
import { teamPalette } from "./team-colors";

describe("teamPalette", () => {
  it("preserves the two canonical colors without deriving new identity colors", () => {
    expect(teamPalette({ primary_color: "#0E2240", secondary_color: "#fec524" }))
      .toEqual(["#0E2240", "#fec524"]);
  });

  it("leaves unknown and partial palettes neutral", () => {
    for (const meta of [null, undefined, {}, { primary_color: "#ffffff" }, { secondary_color: "#000000" }]) {
      expect(teamPalette(meta)).toBeUndefined();
    }
  });

  it("rejects malformed colors before they reach CSS", () => {
    for (const primary_color of ["red", "#fff", "#12345g", "url(https://example.com)", "#123456; display:none"]) {
      expect(teamPalette({ primary_color, secondary_color: "#ffffff" })).toBeUndefined();
      expect(teamPalette({ primary_color: "#ffffff", secondary_color: primary_color })).toBeUndefined();
    }
  });
});
