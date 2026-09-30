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

// ─── ads.txt ───────────────────────────────────────────────────────────────
// AdSense reads /ads.txt to authorize Google to sell this inventory, and the
// console reports "Ads.txt status: Not found" the moment it 404s, serves the
// wrong content type, or stops declaring the publisher ID. That check is
// periodic and can lag a deploy, so a console-side "Not found" is cheap to
// misread — assert the file here instead and catch a bad deploy at release
// time rather than in the console days later.
//
// Shape per IAB ads.txt 1.1 §3.3: <system domain>, <account id>, <DIRECT |
// RESELLER>, [<certification id>]. The ID asserted is the one the app actually
// loads (Document.tsx / AdSlot.tsx), so a publisher-ID swap cannot pass here
// while the console checks the old one.
const ADSENSE_PUBLISHER_ID = "pub-9821466912189944";
{
  const response = await fetch(new URL("/ads.txt", origin), { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `/ads.txt: HTTP ${response.status}`);
  const contentType = response.headers.get("Content-Type") ?? "";
  assert(
    contentType.includes("text/plain"),
    `/ads.txt: content-type is ${contentType || "(none)"}, want text/plain (ads.txt 1.1 §3.2 treats anything else as an error)`,
  );
  const body = await response.text();
  const lines = body.split("\n").filter(line => line.trim() && !line.trim().startsWith("#"));
  assert(lines.length > 0, "/ads.txt: no records");
  const record = /^([^,\s]+),\s*([^,\s]+),\s*(DIRECT|RESELLER)\s*(?:,\s*(\S+))?$/.exec(lines[0]);
  assert(record, `/ads.txt: first record ${JSON.stringify(lines[0])} is not a valid ads.txt data record`);
  assert.equal(record[1], "google.com", `/ads.txt: system is ${record[1]}, want google.com`);
  assert.equal(record[2], ADSENSE_PUBLISHER_ID, `/ads.txt: account is ${record[2]}, want ${ADSENSE_PUBLISHER_ID}`);
  assert.equal(record[3], "DIRECT", `/ads.txt: relationship is ${record[3]}, want DIRECT (we sell directly)`);
  console.log(`verify:live: /ads.txt authorizes google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT`);
}

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

console.log(`verify:live: all ${routes.length} production-page checks + ads.txt passed on ${origin.origin}`);
