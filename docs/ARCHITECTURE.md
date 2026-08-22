# Architecture

SolidStart 2.0 + Solid 1.9 on Cloudflare Workers. Three product pages
and a handful of static pages. This doc records the rules that keep the app
lean; the README covers product framing and workflow.

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
  `/leaderboard`, and an entity profile from the built bundle against a fixture API
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
- `query()` owns caching and in-flight dedup. There are **no** bespoke client
  caches, and warm passes exist only as route `preload()` functions riding the
  router's own intent system (Scott, 2026-08-21 — "eager loading everything"):
  the Router's native anchor prefetch (`<Router preload>`) fires a hovered or
  touched link's chunk import + `preload()`, and each data route's `preload()`
  warms the exact queries its components read (skipped at intent "initial" and
  during SSR). They never re-fetch anything query() already holds.
- Cards own their reads: each profile card calls its own `get<Product>()` in
  `createAsync`. `CARD_REGISTRY` (card-registry.tsx) declares identity/chrome
  only. Every DEALT pane mounts eagerly through SSR; the active tab is
  visibility, not existence.
- The deck is dealt from what the entity holds: `lib/cards/deck-content.ts`
  answers "has this character anything to say?" per card, on the same
  `query()` the pane fetches, so the question costs no extra network.
  ReadingTable renders only the cards that answer yes — no cards, no rail.
  Two rules ride with it, both learned the hard way:
  - The pane list must be a PREFIX-stable sequence across SSR passes. Solid's
    server resources are keyed by tree POSITION, and async SSR renders the
    tree more than once; dealing six panes on one pass and four on the next
    re-seats every pane after the gap, so a card reads the payload its
    neighbour fetched. Nothing is dealt until the answer is in.
  - The card in hand is never pulled: presence is asked under the current
    conditions, so ReadingTable holds the active card even when a scope
    change empties it. That is what the Veil (`<EmptyCard>`) is still for.

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
- `/leaderboard` — one `<Board>` (the page's artifact) under a `<NavWell>`
  whose tab row carries the SPORT; the board itself is switched from the
  AppTray and named in the masthead. All state on the URL. The board data
  SSRs; the cohort filter dropdowns hydrate client-side from the entity
  directory.
- `/profile/{sport}/{type}/{id}-{slug}` — EntityMeta (identity + score chips,
  all SSR) over ReadingTable (every card pane mounted eagerly). Entity
  identity lives in the PATH (one indexable URL per entity — build links via
  `lib/utils/profile-url.ts`; legacy `/profile?sport=…&id=…` links 301 in
  `middleware.ts`); everything else stays on the URL as search params —
  including the active tab (`?tab=`, written with `{ replace: true }`) — via
  the router's `useSearchParams`; `ProfileContext` publishes it to cards.
  Client-side navigation reveals meta-card-first: one shared Suspense over
  EntityMeta + ReadingTable (routes/profile/[sport]/[type]/[id].tsx) so meta
  content and pane skeletons paint together, in final position; pane-level
  boundaries keep every product fetch parallel.
- `/profile` (bare) — the browse directory: universal search plus each
  sport's top players/teams off the same leaderboard query() reads, every row
  linking to a path-based profile. Never an empty deck.

## Card copy

The card is the product and the share artifact — there is no share layer, no
link building, no server-side image rendering. Every profile card:

- carries an identity band ("LEBRON JAMES · LAL · NBA · 2026" — the season
  stamps only when `?season=` scopes the view) plus a quiet wordmark, hidden
  on the page (`display: none`) and revealed only on the artifact: the copy
  captures an off-screen clone with the band shown, so the paste stands alone
  while the on-screen card stays clean. The band rides SSR via the same warm
  `getEntityMeta` query EntityMeta uses (`<Card>` in Card.tsx owns both);
- locks to the portrait tarot silhouette at every viewport (the
  `.reading-table-pane` token override). The landscape flip is retired with
  the landscape tokens themselves — the leaderboard is `<Board>`'s surface
  now, not a wide card;
- fits its content to the silhouette — News caps at the top-3 narratives by
  impact / top-5 rumors by heat; nothing inside a card scrolls or crops;
- renders a `CopyCardButton` (top-right, always visible) that captures the
  card DOM to a 2x PNG via html-to-image and puts it on the clipboard, with
  an `<a download>` fallback when image clipboard is unsupported. Safari
  requires the ClipboardItem to be constructed synchronously inside the click
  gesture with a pending Promise<Blob> — keep that ordering. Third-party
  avatar hosts without CORS headers degrade to a transparent placeholder
  instead of failing the capture.

Link unfurls carry one static brand image for every route
(`public/images/brand-unfurl.png`, defaulted in app.tsx); per-entity
`<title>`/description text still SSRs per route.

## Deploy

`worker.ts` adapts the built SolidStart server (an h3 app) to the Workers
fetch handler; Workers Static Assets serves `dist/client` assets-first
(wrangler.jsonc). `npm run cf:deploy` = build + `wrangler deploy`.

One build workaround remains:

- `scripts/patch-solidstart-error-boundary.mjs` — rebrands the framework's
  hardcoded error-fallback title (string still present, verified against
  2.0.3 at the 2026-08-22 upgrade from 2.0.0-alpha.3; the fallback shape is
  not configurable upstream). The patch fails loudly if upstream changes the
  string, so a silent no-op can't ship.

`h3` is a direct dependency pinned to the exact version `@solidjs/start`
depends on, so `worker.ts` and `verify-ssr.mjs` (which import `h3/cloudflare`
directly) share one deduped copy with the framework. Bump it in lockstep with
SolidStart upgrades.

One harness gotcha, documented in `verify-ssr.mjs`: never import the built
server entry with a query-string cache-buster — it silently breaks server-side
data fetching (distinct module identity from the chunks' shared imports).
