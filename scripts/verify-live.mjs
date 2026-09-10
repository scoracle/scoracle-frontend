import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const origin = new URL(process.argv[2] ?? "https://scoracle.com");
const run = randomUUID();
const routes = [
  { path: "/", marker: "mover-card" },
  { path: "/leaderboard", marker: "lb-main" },
  { path: "/profile/nba/player/177-aaron-gordon", marker: "profile-main" },
  { path: "/profile/nba/team/8-denver-nuggets", marker: "profile-main" },
  { path: "/profile/football/team/113-ac-milan", marker: "profile-main" },
];

for (const route of routes) {
  const url = new URL(route.path, origin);
  // Exercise a fresh SSR document, not an earlier successful page in edge cache.
  url.searchParams.set("release_check", run);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `${route.path}: HTTP ${response.status}`);
  assert(response.headers.get("Content-Type")?.includes("text/html"), `${route.path}: not an HTML document`);
  const html = await response.text();
  const rendered = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  for (const failure of ["Something went sideways", "Couldn't load this profile.", "Uncaught Client Exception", "card-error"]) {
    assert(!rendered.includes(failure), `${route.path}: rendered an error page or pane (${failure})`);
  }
  assert(rendered.includes(route.marker), `${route.path}: expected page content is missing`);
  assert(rendered.includes("page-atmosphere"), `${route.path}: expected background is missing`);
  console.log(`verify:live: ${route.path} returned healthy SSR content`);
}

console.log(`verify:live: all ${routes.length} production-page checks passed on ${origin.origin}`);
