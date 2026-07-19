/**
 * generate-sitemap.mjs — rebuild public/sitemap.xml from the bundled entity
 * directory (public/data/entities.json, produced by `npm run fetch-data`).
 *
 * Static pages first, then one slugged path-based profile URL per entity
 * (`/profile/{sport}/{type}/{id}-{slug}` — same shape as
 * src/lib/utils/profile-url.ts; keep slugify in sync with slugifyName there).
 * Before this existed the sitemap advertised 7 URLs — including a bare
 * /profile that rendered blank — which read as a near-empty site to
 * crawlers and the AdSense review. ~16k entities is well inside the 50k-URL
 * single-sitemap limit.
 *
 * Run after each `npm run fetch-data`:  node scripts/generate-sitemap.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://scoracle.com";

// Keep in sync with slugifyName in src/lib/utils/profile-url.ts.
function slugifyName(name) {
  if (!name) return "";
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.9" },
  { path: "/profile", changefreq: "daily", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/privacy", changefreq: "monthly", priority: "0.3" },
];

const { entities } = JSON.parse(
  readFileSync(join(root, "public/data/entities.json"), "utf8"),
);

const urls = STATIC_PAGES.map(
  (p) => ({ loc: `${ORIGIN}${p.path}`, changefreq: p.changefreq, priority: p.priority }),
);

let skipped = 0;
for (const entity of entities) {
  const sport = String(entity.sport ?? "").toLowerCase();
  const type = entity.type === "team" ? "team" : entity.type === "player" ? "player" : null;
  const id = String(entity.entity_id ?? entity.id ?? "");
  if (!sport || !type || !/^\d+$/.test(id)) {
    skipped += 1;
    continue;
  }
  const slug = slugifyName(entity.name);
  const idSegment = slug ? `${id}-${slug}` : id;
  urls.push({
    loc: `${ORIGIN}/profile/${sport}/${type}/${idSegment}`,
    changefreq: "weekly",
    priority: "0.6",
  });
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) =>
    [
      "  <url>",
      `    <loc>${u.loc}</loc>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      "  </url>",
    ].join("\n"),
  ),
  "</urlset>",
  "",
].join("\n");

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(
  `sitemap.xml: ${urls.length} URLs (${STATIC_PAGES.length} static, ${urls.length - STATIC_PAGES.length} profiles, ${skipped} entities skipped)`,
);
