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
      cardId: "vibes",
      entity: { sport: "nba", type: "player", id: "237" },
    });
    expect(text).toBe("Check out LeBron James's vibes report");
    expect(url).toBe("https://test.example.com/profile?sport=NBA&type=player&id=237&tab=vibes");
  });

  it("uses the card's shareCategory + lands on its tab", () => {
    const { text, url } = buildShareText({
      entityName: "Bukayo Saka",
      cardId: "composite",
      entity: { sport: "football", type: "player", id: "1500" },
    });
    expect(text).toBe("Check out Bukayo Saka's rating report");
    expect(url).toBe(
      "https://test.example.com/profile?sport=FOOTBALL&type=player&id=1500&tab=composite",
    );
  });
});
