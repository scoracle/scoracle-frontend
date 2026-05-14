import { describe, it, expect } from "vitest";
import { deriveInitialTabs } from "./profile-tabs";

describe("deriveInitialTabs", () => {
  it("returns locked defaults for undefined / empty / unknown values", () => {
    const expected = {
      mode: "news",
      newsSubTab: "news",
      statsSubTab: "stats",
    } as const;
    expect(deriveInitialTabs(undefined)).toEqual(expected);
    expect(deriveInitialTabs("")).toEqual(expected);
    expect(deriveInitialTabs("nonsense")).toEqual(expected);
  });

  it("maps news-mode tabs to mode='news' and the right sub-tab", () => {
    expect(deriveInitialTabs("news")).toEqual({
      mode: "news",
      newsSubTab: "news",
      statsSubTab: "stats",
    });
    expect(deriveInitialTabs("x")).toEqual({
      mode: "news",
      newsSubTab: "x",
      statsSubTab: "stats",
    });
    expect(deriveInitialTabs("vibes")).toEqual({
      mode: "news",
      newsSubTab: "vibes",
      statsSubTab: "stats",
    });
  });

  it("maps stats-mode tabs to mode='stats' and the right sub-tab", () => {
    expect(deriveInitialTabs("stats")).toEqual({
      mode: "stats",
      newsSubTab: "news",
      statsSubTab: "stats",
    });
    expect(deriveInitialTabs("traits")).toEqual({
      mode: "stats",
      newsSubTab: "news",
      statsSubTab: "traits",
    });
    expect(deriveInitialTabs("compare")).toEqual({
      mode: "stats",
      newsSubTab: "news",
      statsSubTab: "compare",
    });
  });

  it("is case-insensitive on the tab value", () => {
    expect(deriveInitialTabs("VIBES")).toEqual({
      mode: "news",
      newsSubTab: "vibes",
      statsSubTab: "stats",
    });
    expect(deriveInitialTabs("Compare")).toEqual({
      mode: "stats",
      newsSubTab: "news",
      statsSubTab: "compare",
    });
  });
});
