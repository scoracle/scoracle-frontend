import { describe, it, expect } from "vitest";
import { isChunkLoadError } from "./chunk-reload";

describe("isChunkLoadError", () => {
  it("matches stale dynamic-import failures (Chrome / Firefox / generic)", () => {
    expect(
      isChunkLoadError(
        new Error(
          "Failed to fetch dynamically imported module: https://scoracle.com/_build/assets/leaderboard-B58MvjH-.js",
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
  });

  it("ignores unrelated errors (so real failures still surface)", () => {
    expect(isChunkLoadError(new Error("sparkline 500"))).toBe(false);
    expect(isChunkLoadError("some random string")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
