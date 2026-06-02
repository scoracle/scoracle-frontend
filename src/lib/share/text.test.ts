import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildShareText } from "./text";

describe("buildShareText", () => {
  const originalLocation = globalThis.window?.location;

  beforeEach(() => {
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

  it("composes the canonical 'Check out X's Y report' copy", () => {
    const { text, url } = buildShareText({
      entityName: "LeBron James",
      cardType: "vibe",
      entity: { sport: "nba", type: "player", id: "237" },
      tab: "vibes",
    });
    expect(text).toBe("Check out LeBron James's vibes report");
    expect(url).toBe("https://test.example.com/profile?sport=NBA&type=player&id=237&tab=vibes");
  });

  it("uses sport-aware setpiece label in the copy", () => {
    const nfl = buildShareText({
      entityName: "Tom Brady",
      cardType: "stats:setpiece",
      entity: { sport: "nfl", type: "player", id: "12" },
      tab: "composite",
    });
    expect(nfl.text).toBe("Check out Tom Brady's special teams report");

    const fb = buildShareText({
      entityName: "Bukayo Saka",
      cardType: "stats:setpiece",
      entity: { sport: "football", type: "player", id: "1500" },
      tab: "composite",
    });
    expect(fb.text).toBe("Check out Bukayo Saka's set pieces report");
  });

  it("appends 'comparison' for compare cards", () => {
    const { text } = buildShareText({
      entityName: "Stephen Curry",
      cardType: "compare:attack",
      entity: { sport: "nba", type: "player", id: "115" },
      tab: "composite",
    });
    expect(text).toBe("Check out Stephen Curry's attacking comparison report");
  });
});
