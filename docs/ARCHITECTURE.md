# Architecture

Astro 7.4.12 owns documents and routes on Cloudflare Workers. Solid 1.9.19 owns
focused interactive islands through @astrojs/solid-js 7.1.5. There is one root
package, lockfile and source tree. The Solid 2 application, router/meta packages,
RPC compiler, serializer patch, preload hooks and host wrapper are retired.

## Rendering and navigation

`src/layouts/SiteLayout.astro` owns metadata, global styles, pre-paint theme,
atmosphere, footer and AppTray. Home, profile and leaderboard each import one
main island; About contains only the native Astro tray and ships no Solid runtime. Layout code never imports the
three main experiences together. Home/About prerender; profile and leaderboard
render on demand with synchronous initial island markup.

Astro renders the profile deck container and fixed identity details, and Home's
glass/mist/logo artwork. Named Astro slots place static content inside product
markup without a second state owner or native controller. Solid owns the coherent
Card/deck (including scores, dynamic team, image fallback, rail and conditions)
and Board (including rail, filters and rows). Home's search/movers are a bounded
discovery exception. Do not split each card or the score ring into separate islands.

Browser and crawler documents are identical. Profile HTML includes resolved
identity, metadata and an honest pending deck, not live character readings.
Leaderboard HTML includes parsed headings, controls and an unwritten register.
Products start on browser mount; JavaScript is required for live readings,
rankings and search. There is no UA-specific renderer or full-product SSR path.
Unknown identity is 404; an identity asset outage is uncached 503. Optional palette
metadata has a 1.5-second deadline and neutral fallback.

Ordinary links navigate documents. `createUrlState` restores query state on mount
and popstate, and replaces query fields without erasing other history state.
Theme, tray posture and recents restore from local storage. Browser history owns
cross-document focus/scroll restoration; there is no ClientRouter or persisted
island lifecycle. Zoom uses one same-URL history entry and restores focus, scroll
locks and inert state on dismissal or disposal.

## Product ownership

`createProduct` models pending/success/empty/error, explicit retry, superseding
abort, a 15-second browser deadline and generation guards. Disposal cancels work.
There is no application-wide cache. `createProfileProducts` starts eight primary
reads once; cards, ring scores, membership and conditions share those accessors.
Primitive season/comparison keys prevent unrelated query changes from fetching.

All products start eagerly, independently. The initial deck waits for primary
owners to settle within their deadlines; identity stays visible. Errors keep a
retryable card seat, empty results do not, and a held card survives empty
conditions until the reader selects another. Dealt panes remain mounted; tabs,
edges and swipes change visibility and hidden faces are inert. Missing scores
omit slots; measured zero remains visible.

`createBoardProducts` owns an experience-local keyed collection. Active and five
default warmed boards reuse identical pending/completed keys; sport options load
independently. Only effective endpoint arguments enter keys. Obsolete pending
entries abort; completed entries live until unmount. Each failure retries locally.
Home's directory search and movers have independent readiness and failure paths.

`src/lib/data/` contains product contracts and pure transformations, with no RPC
wrappers. `CARD_REGISTRY` declares cards; `deck-presence` determines content;
`deck-scores` supplies scores. Product derivation remains backend-owned.

## Transport and deployment

`src/pages/api/` exposes narrow validated public-product GET endpoints.
`src/lib/product.server.ts` fixes the upstream origin to `api.scoracle.com/api/v1`.
Browser credentials are never forwarded. `SCORACLE_INTERNAL_KEY` comes from
Worker bindings only. Manual redirects are rejected. The 12-second server
request deadline includes body parsing and composes with cancellation. Upstream
404 is empty; other failures remain errors. A cached upstream error gets one
uncached retry. Successful upstream caching retains its 300-second policy.
All browser API responses are no-store.

Bundled identity reads use ASSETS with the request origin; full maps never enter
island props. The Cloudflare adapter owns the Worker entry and generated output.
`wrangler.jsonc` retains the production Worker name `scoracle-frontend`, ASSETS,
required internal key, timeout and observability. Sessions are disabled and image
delivery is passthrough. Generated bindings come from `npm run cf:types`.

Dynamic document policy lives in `src/lib/response-policy.ts`; prerendered
security headers live in `public/_headers`, with CSP parity checked at build.
Public documents retain max-age=300/stale-while-revalidate=600; errors are no-store.
Hashed `/_astro/` and `/delivery/` assets are immutable. Astro middleware caches
successful public profile and Board documents with version- and host-specific
Cache API keys; `X-Edge-Cache` reports hits/misses. Credentialed requests, APIs,
errors and Set-Cookie responses are excluded. Static Home/About use the assets
runtime. Custom-domain cache behavior remains a Step 7 acceptance item.
Existing CSP is retained pending a separate audit of its unsafe-eval allowance.

## Verification and release boundary

Run `npm run typecheck`, `npm test`, and `npm run cf:build`. Build verification
checks route isolation, server-only transport, static shell content, theme and
security policy. Vitest retains pure/presentation tests; `tests/runtime/*.test.ts`
checks product keys, cancellation, retries, deadlines, transport and identity.

Start `npm run preview`, then run `npm run verify:ssr` and `npm run test:browser`.
The HTTP suite checks shells, metadata, aliases, statuses, redirects and browser/
crawler parity. Browser tests check live products, local faults, controls, search,
zoom and mobile bounds. The Chrome DevTools probes in `tests/runtime/` add owner
fault/disposal and history assertions. Explicitly stop background Astro services
with `npm run preview:stop` / `npm run dev:stop` when finished.

`npm run cf:deploy:dry` validates the generated bundle without publishing. Step 7
must establish matched performance/readiness, deployed binding/cache behavior,
broader navigation acceptance and rollback/release notes before release. No
migration completion, speed improvement or production readiness is implied by a
successful local build. See the [canonical migration plan](../../scoracle-wiki/progress_docs/scoracle-frontend/2026-11-07_astro-migration-plan.md)
and [detailed runtime contracts](astro-runtime.md).
