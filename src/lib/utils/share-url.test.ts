import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildShareUrl } from "./share-url";

describe("buildShareUrl", () => {
  const originalLocation = globalThis.window?.location;

  beforeEach(() => {
    // Default test environment is happy-dom; window.location.origin is
    // "http://localhost:3000". Pin it for deterministic assertions.
    if (globalThis.window) {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { origin: "https://test.example.com" } as Location,
      });
    }
  });

  afterEach(() => {
    if (globalThis.window && originalLocation) {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("upper-cases sport, lower-cases path, keeps id", () => {
    const url = buildShareUrl({ sport: "nba", type: "player", id: "237" });
    expect(url).toBe(
      "https://test.example.com/profile?sport=NBA&type=player&id=237",
    );
  });

  it("appends tab= when provided", () => {
    const url = buildShareUrl(
      { sport: "nba", type: "player", id: "237" },
      "vibes",
    );
    expect(url).toBe(
      "https://test.example.com/profile?sport=NBA&type=player&id=237&tab=vibes",
    );
  });

  it("omits tab when undefined", () => {
    const url = buildShareUrl({ sport: "NBA", type: "team", id: "1" });
    expect(url).not.toContain("tab=");
  });

  it("accepts all six tab values without throwing", () => {
    const entity = { sport: "nba" as const, type: "player" as const, id: "1" };
    const tabs = ["news", "x", "vibes", "stats", "traits", "compare"] as const;
    for (const tab of tabs) {
      expect(buildShareUrl(entity, tab)).toContain(`tab=${tab}`);
    }
  });

  it("preserves already-upper-case sport names", () => {
    const url = buildShareUrl({ sport: "FOOTBALL", type: "team", id: "42" });
    expect(url).toContain("sport=FOOTBALL");
  });

  it("falls back to production origin when window is undefined", () => {
    // Simulate a server-side render where window doesn't exist.
    const savedWindow = globalThis.window;
    // @ts-expect-error — intentional teardown to mimic SSR
    delete globalThis.window;
    try {
      const url = buildShareUrl(
        { sport: "nba", type: "player", id: "1" },
        "vibes",
      );
      expect(url.startsWith("https://scoracle.com/profile?")).toBe(true);
    } finally {
      globalThis.window = savedWindow;
    }
  });
});
