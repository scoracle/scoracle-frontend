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
      cardId: "sigil",
      entity: { sport: "nba", type: "player", id: "237" },
    });
    expect(text).toBe("Check out LeBron James's sigil report");
    expect(url).toBe("https://test.example.com/profile?sport=NBA&type=player&id=237&tab=sigil");
  });

  it("uses the card's shareCategory + lands on its tab", () => {
    const { text, url } = buildShareText({
      entityName: "Bukayo Saka",
      cardId: "stats",
      entity: { sport: "football", type: "player", id: "1500" },
    });
    expect(text).toBe("Check out Bukayo Saka's stats report");
    expect(url).toBe(
      "https://test.example.com/profile?sport=FOOTBALL&type=player&id=1500&tab=stats",
    );
  });
});
