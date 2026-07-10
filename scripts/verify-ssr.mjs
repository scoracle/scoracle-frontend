import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { serve } from "h3/cloudflare";

const root = process.cwd();
const serverEntry = join(root, "dist/server/entry-server.js");
const clientDir = join(root, "dist/client");

process.env.SCORACLE_DEBUG_SSR_ERRORS ??= "1";

if (!existsSync(serverEntry) || !existsSync(clientDir)) {
  throw new Error("dist/server and dist/client are missing. Run `npm run cf:build` before `npm run verify:ssr`.");
}

const originalFetch = globalThis.fetch.bind(globalThis);

const newsScope = {
  key: "current_week",
  label: "Current week",
  starts_at: "2026-07-06T00:00:00Z",
  ends_at: "2026-07-12T23:59:59Z",
};

const leaderboardLeader = {
  entity_type: "player",
  id: 177,
  name: "Aaron Gordon",
  image: null,
  position: "F",
  team_id: 8,
  team_name: "Denver Nuggets",
  team_code: "DEN",
  team_logo: null,
  league_id: null,
  rating_composite: 1,
  rating_peak: 1,
  rating_peak_label: "Finishing",
  rating_composite_rank: 81,
  rating_peak_rank: 77,
  rating_composite_score: 58.4,
  rating_peak_score: 56.1,
  rank: 1,
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

function fixtureApi(url) {
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const sport = path.split("/")[1];

  if (path === "/entities") {
    return json({ entities: [{ entity_id: 177, name: "Aaron Gordon", type: "player", sport: "nba" }] });
  }

  if (path === "/nba/leaderboard") {
    return json({
      page: "leaderboard",
      sport: "NBA",
      entity_type: url.searchParams.get("entity_type") ?? "player",
      season: 2026,
      available_seasons: [2026, 2025],
      scope: url.searchParams.get("scope") ?? "composite",
      count: 1,
      leaders: [leaderboardLeader],
    });
  }

  if (path === "/nba/leaderboard/news") {
    return json({
      page: "news_leaderboard",
      sport: "NBA",
      entity_type: url.searchParams.get("entity_type") ?? "player",
      scope: url.searchParams.get("scope") ?? "current_week",
      count: 1,
      leaders: [
        {
          entity_type: "player",
          id: 177,
          name: "Aaron Gordon",
          image: null,
          team_id: 8,
          team_name: "Denver Nuggets",
          team_code: "DEN",
          team_logo: null,
          score: 73,
          rank: 1,
          narrative_title: "Fixture narrative",
          body: "Fixture news body",
          updated_at: "2026-07-10T12:00:00Z",
          source_count: 1,
          source_names: ["Fixture Wire"],
          source_latest_at: "2026-07-10T12:00:00Z",
          source_oldest_at: "2026-07-10T12:00:00Z",
          trajectory: "developing_story",
          trajectory_label: "Developing story",
          trajectory_components: {},
        },
      ],
    });
  }

  if (path === "/nba/leaderboard/vibes") {
    return json({
      page: "vibes_leaderboard",
      sport: "NBA",
      entity_type: url.searchParams.get("entity_type") ?? "player",
      count: 1,
      leaders: [{ ...leaderboardLeader, score: 84, blurb: "Fixture vibe read" }],
    });
  }

  if (path === "/nba/leaderboard/momentum") {
    return json({
      page: "trending_leaderboard",
      metric: url.searchParams.get("metric") ?? "vibe",
      sport: "NBA",
      entity_type: url.searchParams.get("entity_type") ?? "player",
      count: 1,
      leaders: [{ ...leaderboardLeader, score: 9, slope: 9 }],
    });
  }

  if (path === "/nba/leaderboard/sigil") {
    return json({
      page: "sigil_leaderboard",
      sport: "NBA",
      entity_type: url.searchParams.get("entity_type") ?? "player",
      season: 2026,
      count: 1,
      leaders: [{ ...leaderboardLeader, score: 84, previous_score: 80, blurb: "Fixture synthesis" }],
    });
  }

  if (path === "/nba/leaderboard/transfers") {
    return json({
      page: "transfers_leaderboard",
      sport: "NBA",
      scope: url.searchParams.get("scope") ?? "current_week",
      count: 0,
      rumors: [],
    });
  }

  if (sport === "nba" && path === "/nba/player/177/stats") {
    return json({
      page: "stats",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      season: 2026,
      available_seasons: [2026],
      rating: null,
      events: [],
    });
  }

  if (sport === "nba" && path === "/nba/player/177/rating") {
    return json({
      page: "rating",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      season: 2026,
      rating: null,
      commentary: null,
    });
  }

  if (sport === "nba" && path === "/nba/player/177/news") {
    return json({
      page: "news",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      scope: newsScope,
      narratives: [],
    });
  }

  if (sport === "nba" && path === "/nba/player/177/transfers") {
    return json({
      page: "transfers",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      scope: newsScope,
      transfers: [],
    });
  }

  if (sport === "nba" && path === "/nba/player/177/momentum") {
    return json({
      page: "momentum",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      window: { games_used: 0, fixture_ids: [], spans_prior_season: false },
      entity_recent_avgs: {},
      entity_season_avgs: {},
      peer_season_avgs: {},
      peer_cohort_size: 0,
      entity_event_scores: [],
      entity_season_score_avg: null,
      peer_season_score_avg: 50,
      entity_alltime_score_rank: null,
      vibes: { window_days: 7, snapshots: [] },
      entity_season_sentiment_series: [],
      meta: { season: 2026, league_id: null, position: "F" },
    });
  }

  if (sport === "nba" && path === "/nba/player/177/sigil") {
    return json({
      page: "sigil",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      current: {
        score: 84,
        blurb: "Fixture synthesis for Aaron Gordon.",
        previous_score: 80,
        model_version: "gemma-fixture",
        prompt_version: "fixture",
        generated_at: "2026-07-10T12:00:00Z",
      },
      history: [{ score: 84, generated_at: "2026-07-10T12:00:00Z" }],
    });
  }

  throw new Error(`verify:ssr fixture API does not cover ${url.href}`);
}

globalThis.fetch = (input, init) => {
  const request = input instanceof Request ? input : null;
  const rawUrl = request?.url ?? String(input);
  const url = new URL(rawUrl);
  const isFixtureApi =
    (url.hostname === "api.scoracle.com" || url.hostname === "localhost") &&
    url.pathname.startsWith("/api/v1");

  if (isFixtureApi) return Promise.resolve(fixtureApi(url));
  return originalFetch(input, init);
};

function contentType(pathname) {
  const ext = extname(pathname).toLowerCase();
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".woff2") return "font/woff2";
  return "application/octet-stream";
}

const assets = {
  async fetch(input) {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const file = join(clientDir, rel);
    try {
      return new Response(await readFile(file), {
        headers: { "Content-Type": contentType(url.pathname) },
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  },
};

const entryUrl = pathToFileURL(serverEntry);
entryUrl.search = `verify=${Date.now()}`;
const app = (await import(entryUrl.href)).default;
const server = serve(app, { manual: true });
const env = { ASSETS: assets };
const ctx = { waitUntil() {}, passThroughOnException() {} };

const routes = [
  {
    path: "/",
    marker: "SCORACLE",
  },
  {
    path: "/leaderboard?sport=NBA",
    marker: "SCORACLE LEADERBOARD",
  },
  {
    path: "/profile?sport=NBA&type=player&id=177&tab=sigil",
    marker: "Aaron Gordon",
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function textAround(haystack, needle) {
  const index = haystack.indexOf(needle);
  if (index < 0) return "";
  const start = Math.max(0, index - 160);
  const end = Math.min(haystack.length, index + 420);
  return haystack
    .slice(start, end)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertHealthyRouteHtml(html, route) {
  assert(!html.includes("route-loading"), `${route.path} rendered route-loading`);
  assert(
    !html.includes("Something went sideways"),
    `${route.path} rendered the root error fallback: ${textAround(html, "Something went sideways")}`,
  );
  assert(!html.includes("Error | Uncaught Client Exception"), `${route.path} rendered SolidStart fallback title`);
  assert(html.includes(route.marker), `${route.path} did not include route marker ${route.marker}`);
}

async function render(path, headers = {}) {
  const response = await server.fetch(
    new Request(`https://scoracle.com${path}`, {
      headers: {
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Site": "none",
        ...headers,
      },
    }),
    env,
    ctx,
  );
  const html = await response.text();
  return { response, html };
}

for (const route of routes) {
  const normal = await render(route.path);
  assert(normal.response.status === 200, `${route.path} normal status ${normal.response.status}`);
  assert(normal.html.includes('data-scoracle-render="interactive"'), `${route.path} normal render mode missing`);
  assert(/<script\b[^>]*entry-client-[^>]*\.js/i.test(normal.html), `${route.path} normal entry-client script missing`);
  assert(/<link\b[^>]*modulepreload/i.test(normal.html), `${route.path} normal modulepreload missing`);
  assertHealthyRouteHtml(normal.html, route);

  const review = await render(route.path, {
    "User-Agent": "Mozilla/5.0 (compatible; AdsBot-Google; +http://www.google.com/adsbot.html)",
  });
  assert(review.response.status === 200, `${route.path} review status ${review.response.status}`);
  assert(
    review.response.headers.get("X-Scoracle-Render-Mode") === "review-ssr",
    `${route.path} review render header missing`,
  );
  assert(
    review.response.headers.get("Content-Security-Policy")?.includes("script-src 'none'"),
    `${route.path} review CSP does not disable scripts`,
  );
  assert(review.html.includes('data-scoracle-render="review-ssr"'), `${route.path} review render mode missing`);
  assert(!/<script\b/i.test(review.html), `${route.path} review HTML contains a script tag`);
  assert(!/modulepreload/i.test(review.html), `${route.path} review HTML contains modulepreload`);
  assertHealthyRouteHtml(review.html, route);
}

console.log(`verify:ssr: checked ${routes.length} routes in normal and review SSR modes`);
