import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileReads, preloadProfile } from "./profile-data";
import { getNews } from "./news.server";
import { getTransfers } from "./transfers.server";
import { getNewsLeaderboard, getTransfersLeaderboard, getVibesLeaderboard, getSigilLeaderboard } from "./leaderboard.server";
import { entityProductUrl, leaderboardUrl } from "../utils/data-sources";

const transport = vi.hoisted(() => vi.fn());
vi.mock("./fetch-json.server", () => ({ fetchJsonOrNull: transport }));
vi.mock("@solidjs/router", () => ({ query: (read: unknown) => read }));
vi.mock("./entity-meta.server", () => ({ getEntityMeta: vi.fn().mockResolvedValue(null) }));
vi.mock("./entity-colors.server", () => ({ getEntityColors: vi.fn().mockResolvedValue(null) }));

const saved = { date: "2025-11-20", narratives: [{ body: "Latest available, even when older than today." }] };
beforeEach(() => { transport.mockReset().mockResolvedValue(saved); });

function expectLatestRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(transport.mock.calls.at(-1)![0]);
  expect(url.pathname).toBe(`/api/v1/${path}`);
  expect(Object.fromEntries(url.searchParams)).toEqual(params);
}

describe("latest reporting requests", () => {
  it.each(["nba", "nfl", "football"])("lets the backend choose older latest news/transfers for %s", async sport => {
    for (const type of ["player", "team"]) {
      expect(await getNews(sport, type, "177")).toEqual(saved);
      expectLatestRequest(`${sport}/${type}/177/news`);
      expect(await getTransfers(sport, type, "177")).toEqual(saved);
      expectLatestRequest(`${sport}/${type}/177/transfers`);
    }
  });

  it("keeps board cohort filters without sending dates or weekly scopes", async () => {
    await getNewsLeaderboard("nba", "team", 50, { teamId: 8 });
    expectLatestRequest("nba/leaderboard/news", { entity_type: "team", limit: "50", team_id: "8" });
    await getTransfersLeaderboard("nba", 50, 8);
    expectLatestRequest("nba/leaderboard/transfers", { limit: "50", team_id: "8" });
    await getVibesLeaderboard("nba", "player", 50, { teamId: 8 });
    expectLatestRequest("nba/leaderboard/vibes", { entity_type: "player", limit: "50", team_id: "8" });
    await getSigilLeaderboard("nba", "player", 50, 2024, { teamId: 8 });
    expectLatestRequest("nba/leaderboard/sigil", { entity_type: "player", limit: "50", season: "2024", team_id: "8" });
  });

  it("uses the same latest product reads for preloading and mounted profiles", async () => {
    const ctx = { sport: () => "nba", type: () => "player" as const, id: () => "177", season: () => 2024, vs: () => "203999" };
    const reads = profileReads(ctx);
    await Promise.all(Object.values(reads).map(read => read()));
    const mounted = transport.mock.calls.map(([target]) => target);
    transport.mockClear();
    preloadProfile(ctx);
    expect(transport.mock.calls.map(([target]) => target)).toEqual(mounted);
    const paths = mounted.map(raw => new URL(raw).pathname);
    expect(paths).toContain("/api/v1/nba/player/177/news");
    expect(paths).toContain("/api/v1/nba/player/177/transfers");
    expect(paths).toContain("/api/v1/nba/player/177/vibe");
    expect(paths.some(path => /\/(weeks|headlines)$/.test(path))).toBe(false);
    for (const raw of mounted) {
      const url = new URL(raw);
      expect(["scope", "year", "week", "date"].some(key => url.searchParams.has(key))).toBe(false);
    }
  });

  it("retains the separate stats season and rating board scope contract", () => {
    expect(new URL(entityProductUrl("nba", "player", "177", "stats", 2024)).search).toBe("?season=2024");
    expect(new URL(leaderboardUrl("nba", "player", "composite", 2024)).searchParams.get("scope")).toBe("composite");
  });
});
