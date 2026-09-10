import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonOrNull } from "./fetch-json.server";

const state = vi.hoisted(() => ({
  internalKey: "fixture-internal-key" as string | undefined,
  response: { status: 200, headers: new Headers() },
}));

vi.mock("../utils/cloudflare-env", () => ({
  getCloudflareEnv: () => ({ SCORACLE_INTERNAL_KEY: state.internalKey }),
}));
vi.mock("solid-js/web", () => ({
  getRequestEvent: () => ({ response: state.response }),
}));

const target = { url: "https://api.scoracle.com/api/v1/nba/player/177/stats", headers: { Accept: "application/json" } };

beforeEach(() => {
  state.internalKey = "fixture-internal-key";
  state.response = { status: 200, headers: new Headers() };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchJsonOrNull", () => {
  it("sends the internal key and caches only successful API responses", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ score: 79 }));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchJsonOrNull(target, "stats")).toEqual({ score: 79 });
    expect(fetch).toHaveBeenCalledWith(target.url, {
      headers: { Accept: "application/json", "X-Scoracle-Internal-Key": "fixture-internal-key" },
      cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 300, "300-599": -1 } },
    });
    expect(state.response.status).toBe(200);
    expect(state.response.headers.has("Cache-Control")).toBe(false);
  });

  it("omits the internal header when no Worker key is configured", async () => {
    state.internalKey = undefined;
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetch);
    await fetchJsonOrNull(target, "stats");
    expect(fetch.mock.calls[0][1].headers).toEqual({ Accept: "application/json" });
  });

  it("keeps missing optional products nullable without failing the document", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    expect(await fetchJsonOrNull(target, "stats")).toBeNull();
    expect(state.response.status).toBe(200);
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([429, 500, 503])("marks an API %i as an uncached service failure", async (status) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: "RATE_LIMITED" }, {
      status,
      headers: { "CF-Cache-Status": "DYNAMIC" },
    }));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchJsonOrNull(target, "stats")).rejects.toThrow(`stats ${status}`);
    expect(state.response.status).toBe(503);
    expect(state.response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("[scoracle:api-error]", expect.objectContaining({
      product: "stats", status, cacheStatus: "DYNAMIC", internalKeyConfigured: true,
    }));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("fixture-internal-key");
  });

  it("rechecks an old cached 429 once without cache and recovers", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response("cached failure", { status: 429, headers: { "CF-Cache-Status": "HIT" } }))
      .mockResolvedValueOnce(Response.json({ score: 79 }));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchJsonOrNull(target, "stats")).toEqual({ score: 79 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(target.url, {
      headers: { Accept: "application/json", "X-Scoracle-Internal-Key": "fixture-internal-key" },
      cache: "no-store",
    });
    expect(state.response.status).toBe(200);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("stops after the uncached recheck also fails", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "CF-Cache-Status": "HIT" } }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchJsonOrNull(target, "stats")).rejects.toThrow("stats 429");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(state.response.status).toBe(503);
    expect(state.response.headers.get("Cache-Control")).toBe("no-store");
  });
});
