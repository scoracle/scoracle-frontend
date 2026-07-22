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

  // The home page fetches every sport's board; serve the same fixture rows
  // for all three so its strips render.
  if (/^\/(nba|nfl|football)\/leaderboard$/.test(path)) {
    return json({
      page: "leaderboard",
      sport: sport.toUpperCase(),
      entity_type: url.searchParams.get("entity_type") ?? "player",
      season: 2026,
      available_seasons: [2026, 2025],
      scope: url.searchParams.get("scope") ?? "composite",
      count: 1,
      leaders: [leaderboardLeader],
    });
  }

  if (/^\/(nba|nfl|football)\/leaderboard\/news$/.test(path)) {
    return json({
      page: "news_leaderboard",
      sport: sport.toUpperCase(),
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

  // Home fans out to every sport × metric × direction for the crystal ball's
  // movers; fallers carry negative scores.
  if (/^\/(nba|nfl|football)\/leaderboard\/momentum$/.test(path)) {
    const sign = url.searchParams.get("direction") === "down" ? -1 : 1;
    return json({
      page: "trending_leaderboard",
      metric: url.searchParams.get("metric") ?? "vibe",
      sport: sport.toUpperCase(),
      entity_type: url.searchParams.get("entity_type") ?? "player",
      count: 1,
      leaders: [{ ...leaderboardLeader, score: 9 * sign, slope: 9 * sign }],
    });
  }

  if (path === "/nba/leaderboard/sigil") {
    return json({
      page: "sigil_leaderboard",
      sport: "NBA",
      entity_type: url.searchParams.get("entity_type") ?? "player",
      season: 2026,
      count: 1,
      leaders: [
        {
          ...leaderboardLeader,
          score: 84,
          previous_score: 80,
          // Session C: board prose is the Oracle reading (blurb never served).
          reading: "Fixture board reading — the crown holds its bright line.",
        },
      ],
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

  if (sport === "nba" && path === "/nba/player/177/momentum/summary") {
    return json({
      page: "momentum_summary",
      sport: "nba",
      entity_type: "player",
      entity_id: 177,
      season: 2026,
      summary: {
        direction: "steady",
        score: 1,
        blurb: "Fixture verdict for Aaron Gordon — PEAK and Vibe hold level.",
        model_version: "gemma-fixture",
        prompt_version: "fixture",
        generated_at: "2026-07-10T12:00:00Z",
      },
      scores: null,
    });
  }

  if (sport === "nba" && path === "/nba/player/177/sigil") {
    // Session C shape: ONE current object carrying the decided card AND its
    // Oracle voice — no `oracle` sub-object, no blurb anywhere. voiced_at is
    // deliberately OLDER than generated_at (a carried-forward voice) so the
    // "drawn <date>" marker proves the credit prefers voiced_at.
    return json({
      page: "sigil",
      sport: "NBA",
      entity_type: "player",
      entity_id: 177,
      current: {
        score: 84,
        convergence: 72,
        previous_score: 80,
        reading: "Fixture reading for Aaron Gordon — the spread holds its bright line.",
        omen: "ascendant",
        voiced_at: "2026-07-10T12:00:00Z",
        voice_model_version: "qwen-fixture",
        voice_prompt_version: "fixture",
        model_version: "gemma-fixture",
        prompt_version: "fixture",
        generated_at: "2026-07-12T12:00:00Z",
      },
      history: [{ score: 84, generated_at: "2026-07-12T12:00:00Z" }],
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

// NOTE: no query-string cache-buster on this import. Importing the entry as
// `entry-server.js?verify=...` gives it a distinct module identity from the
// chunks' shared imports and silently breaks server-side data fetching (the
// strips/cards render empty with zero API calls). A fresh process needs no
// cache busting.
const app = (await import(pathToFileURL(serverEntry).href)).default;
const server = serve(app, { manual: true });
const env = { ASSETS: assets };
const ctx = { waitUntil() {}, passThroughOnException() {} };

// Every route must ship real content in the initial HTML — the same HTML for
// a browser and for a crawler. `markers` are strings that only appear when the
// route's data actually rendered (not just the chrome).
const routes = [
  {
    path: "/",
    // "mover-card" asserts the crystal ball SSR'd its first momentum mover.
    // (The "Sports intelligence, distilled" tagline left the hero with the
    // crystal-ball rework; the headline + strips carry the markers now.)
    markers: ["SCORACLE", "Aaron Gordon", "Full leaderboard", "mover-card"],
  },
  {
    path: "/leaderboard?sport=NBA",
    // The headline carries the board since f1c2d17 (board switching moved to
    // the AppTray); default board is Rating.
    markers: ["RATING LEADERBOARD", "Aaron Gordon"],
  },
  {
    path: "/profile/nba/player/177-aaron-gordon?tab=sigil",
    // Meta card identity (name + team link) plus the sigil pane's anchored
    // describer — data-bearing strings from both cards of the spread. (The
    // old identity-band marker is gone: the share artifact is composed at
    // capture time by <ShadowCard>, not SSR'd.)
    markers: [
      "Aaron Gordon",
      "Denver Nuggets",
      // The sigil card's voice: the Oracle reading + its omen seal (the
      // blurb is internal scaffolding and must NOT render — see below).
      "Fixture reading for Aaron Gordon",
      "Omen: ascendant",
      // Serve-latest honesty: the credit leads with the reading's drawn date.
      "drawn Jul 10",
      "Season synthesis, read as a sigil",
      // The momentum pane's trajectory-first verdict (the /momentum/summary
      // product) must SSR with the rest of the spread.
      "Fixture verdict for Aaron Gordon",
    ],
    // The synthesis blurb retired from render (Session A) and then from the
    // payload entirely (Session C — the API serves no blurb key on /sigil).
    // Kept as a tripwire: this string reappearing means someone re-served the
    // second voice through a fixture regression.
    absentMarkers: ["Fixture synthesis for Aaron Gordon."],
  },
  {
    path: "/profile",
    // The browse directory (2026-07-18): bare /profile must never render an
    // empty deck again — search plus each sport's leaders, rows linking to
    // path-based profile URLs.
    markers: ["Browse profiles", "Aaron Gordon", "/profile/nba/player/177-aaron-gordon"],
  },
];

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Mediapartners-Google/2.1; +http://www.google.com/bot.html)";

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
  assert(
    !html.includes("card-error"),
    `${route.path} rendered a card error pane: ${textAround(html, "card-error")}`,
  );
  // Markers assert rendered CONTENT, so strip solid's hydration comments
  // first — SSR splits mixed static+dynamic text ("drawn {date}") into
  // `drawn <!--$-->Jul 10<!--/-->`, which would defeat a naive includes().
  const contentHtml = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const marker of route.markers) {
    assert(contentHtml.includes(marker), `${route.path} did not include route marker ${marker}`);
  }
  // Absent markers assert retired content stays out of the RENDERED document.
  // Script bodies are masked first: the router's hydration payload still
  // carries the raw field (e.g. the sigil blurb until Session C reshapes the
  // payload) — retirement is about what renders, not what the API serves.
  const rendered = comparableHtml(html);
  for (const marker of route.absentMarkers ?? []) {
    assert(!rendered.includes(marker), `${route.path} rendered retired content: ${marker}`);
  }
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

// Mask inline-script BODIES before comparing: solid-router's serialized
// hydration ids vary run-to-run with module-level cache state, which is
// noise. Script TAGS (inline and src=) stay in the comparison, so a
// UA-conditional script strip — the cloaking pattern this guards against —
// still fails the equality check.
function comparableHtml(html) {
  return html.replace(/(<script(?![^>]*\bsrc=)[^>]*>)[\s\S]*?(<\/script>)/gi, "$1…$2");
}

for (const route of routes) {
  const browser = await render(route.path, { "User-Agent": CHROME_UA });
  assert(browser.response.status === 200, `${route.path} status ${browser.response.status}`);
  assert(/<script\b[^>]*entry-client-[^>]*\.js/i.test(browser.html), `${route.path} entry-client script missing`);
  assert(/<link\b[^>]*modulepreload/i.test(browser.html), `${route.path} modulepreload missing`);
  assertHealthyRouteHtml(browser.html, route);

  // The rendering contract: a crawler gets the same document a browser gets.
  // No render modes, no stripped scripts, no UA-conditional anything.
  const crawler = await render(route.path, { "User-Agent": GOOGLEBOT_UA });
  assert(crawler.response.status === 200, `${route.path} crawler status ${crawler.response.status}`);
  assert(
    comparableHtml(crawler.html) === comparableHtml(browser.html),
    `${route.path} crawler HTML differs from browser HTML`,
  );
}

// Profile URL contract (2026-07-18): legacy query-param deep links 301 to the
// path shape with secondary params carried along, and malformed profile paths
// are real 404s — never a blank 200.
{
  const legacy = await render("/profile?sport=NBA&type=player&id=177&tab=sigil", {
    "User-Agent": GOOGLEBOT_UA,
  });
  assert(legacy.response.status === 301, `legacy profile URL status ${legacy.response.status}, want 301`);
  const location = legacy.response.headers.get("Location");
  assert(
    location === "/profile/nba/player/177?tab=sigil",
    `legacy profile redirect Location ${location}`,
  );

  const badSport = await render("/profile/cricket/player/1", { "User-Agent": GOOGLEBOT_UA });
  assert(badSport.response.status === 404, `unknown-sport profile status ${badSport.response.status}, want 404`);
}

console.log(`verify:ssr: checked ${routes.length} routes — full SSR content, identical for browser and crawler`);
console.log("verify:ssr: legacy /profile?… 301s to the path shape; malformed profile paths 404");
