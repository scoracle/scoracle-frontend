# Architecture

SolidStart 2.0-alpha + Solid 1.9 on Cloudflare Workers. Three product pages, a
handful of static pages, and an OG-image endpoint. This doc records the rules
that keep the app lean; the README covers product framing and workflow.

## The rendering contract

Every request — user or crawler — gets the same fully server-rendered HTML,
then hydrates. This is the load-bearing rule of the codebase:

- `entry-server.tsx` renders one document in `mode: "async"`: SSR awaits all
  suspending data before the flush, so real content (and per-route
  `<title>`/`<meta>` via `@solidjs/meta`) lands in the initial HTML.
- **No UA sniffing, no render modes, no crawler-conditional anything.** A
  crawler-special path is cloaking — an AdSense/Search policy violation — and
  it's how this repo once accumulated an entire parallel rendering pipeline.
  Do not reintroduce one, whatever the symptom.
- `scripts/verify-ssr.mjs` enforces the contract: it renders `/`,
  `/leaderboard`, and `/profile` from the built bundle against a fixture API
  and asserts real content markers plus browser/crawler HTML equality
  (inline-script bodies masked — serialized hydration ids vary run-to-run).
  Run it (`npm run verify:ssr`, after `npm run cf:build`) for any change
  touching SSR or data flow.

## Data flow

One pattern, everywhere: a `"use server"` fetcher wrapped in `query()` from
`@solidjs/router`, read by components through `createAsync`.

- `src/lib/data/*.server.ts` — one module per product (stats, rating, news,
  transfers, momentum, sigil, leaderboard boards). All go through
  `fetchJsonOrNull` (`fetch-json.server.ts`), the single fetch choke-point.
- `src/lib/data/entity-directory.ts` — the bundled entity JSON
  (`public/data/*.json`, refreshed by `npm run fetch-data`) as query() loaders:
  per-sport directory, universal directory, per-sport meta maps. Browser reads
  fetch the version-busted URL; SSR reads go through the ASSETS binding
  (`readServerAssetText`) — never a self-origin HTTP fetch, which 522s inside
  a Worker. Large payloads: only read them in client-driven paths (effects) or
  through narrowing queries like `getEntityMeta`, so SSR never serializes a
  whole directory into the page.
- `query()` owns caching and in-flight dedup. There are deliberately **no**
  warm passes, preload side-channels, or bespoke client caches — adding one
  back means re-fetching data query() already holds.
- Cards own their reads: each profile card calls its own `get<Product>()` in
  `createAsync`. `CARD_REGISTRY` (card-registry.tsx) declares identity/chrome
  only. Every pane mounts eagerly through SSR; the active tab is visibility,
  not existence.

### Upstream API protection

`fetchJsonOrNull` attaches two Workers-only behaviors:

- `X-Scoracle-Internal-Key` (Worker secret `SCORACLE_INTERNAL_KEY`, set via
  `wrangler secret put`) — the Go API exempts requests bearing it from the
  per-IP rate limit. Worker egress IPs are shared Cloudflare IPs, so without
  the exemption one busy page view can exhaust a bucket and SSR sees 429s.
  Backend side: `RATE_LIMIT_INTERNAL_KEY` env in scoracle-backend.
- `cf: { cacheTtl: 300, cacheEverything: true }` — repeat reads of a product
  URL serve from the Cloudflare edge cache instead of re-hitting the API.

Documents are also edge-cached (middleware.ts: `max-age=300,
stale-while-revalidate=600` on the seven document paths).

## Pages

- `/` — hero (wordmark, crystal ball, universal search) + server-rendered
  content strips per sport (top-5 rating rows + leading narrative, reusing the
  leaderboard queries) + an about blurb. The strips are what give the landing
  page substantive HTML — keep them server-rendered.
- `/leaderboard` — six boards behind one rail; all state on the URL. The board
  data SSRs; the cohort filter dropdowns hydrate client-side from the entity
  directory.
- `/profile` — EntityMeta (identity + score chips, all SSR) over ContentShell
  (every card pane mounted eagerly). All state on the URL via
  `useUrlSearchParams`; `ProfileContext` publishes it to cards.
- `/og/[cardType]/[sport]/[type]/[id]` — server-rendered share images
  (`src/lib/og/`, resvg-wasm). Self-contained subsystem.

## Deploy

`worker.ts` adapts the built SolidStart server (an h3 app) to the Workers
fetch handler; Workers Static Assets serves `dist/client` assets-first
(wrangler.jsonc). `npm run cf:deploy` = build + `wrangler deploy`.

Two build workarounds remain, both SolidStart-alpha artifacts to revisit on
framework upgrade:

- `scripts/patch-solidstart-error-boundary.mjs` — rebrands the framework's
  hardcoded error-fallback title.
- `scripts/clean-wrangler-ssr-imports.mjs` — strips dead side-effect bare
  imports from server chunks that Wrangler can't bundle.

One harness gotcha, documented in `verify-ssr.mjs`: never import the built
server entry with a query-string cache-buster — it silently breaks server-side
data fetching (distinct module identity from the chunks' shared imports).
