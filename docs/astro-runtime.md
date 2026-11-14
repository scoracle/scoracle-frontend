# Astro runtime contracts

The root package owns Astro documents, stable Solid islands and Cloudflare
endpoints. Components live in `src/components`, experiences in `src/islands`,
routes in `src/pages`, and product owners/transport in `src/lib`. Pure identity,
statistics and membership helpers, global CSS and public assets remain shared.
There is no nested runtime package or retained Solid 2 application.

## Supported dependency set

Verified against npm manifests, installed sources, Astro checks and a real
Cloudflare workerd build/preview on 2026-11-12:

| Package | Pin / locked version |
| --- | --- |
| Astro | 7.4.12 |
| @astrojs/solid-js | 7.1.5 (peer: solid-js ^1.9.13) |
| Solid | 1.9.19 |
| @astrojs/cloudflare | 14.4.7 (peer: Astro ^7.4.0, Wrangler ^4.125.0) |
| Wrangler | 4.161.0 |
| Vite / vite-plugin-solid | lockfile: 8.3.8 / 2.11.16 |
| @astrojs/check / TypeScript | 0.9.12 / 5.9.3 |
| @cloudflare/workers-types | 5.20261112.1 |
| Node | >=22.23.4; verified on 26.7.0 |

Sources: [Solid integration](https://docs.astro.build/en/guides/integrations-guide/solid-js/),
[Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).
No force-installed incompatible peers, renderer patches or experimental features.
Sessions are disabled; existing assets use passthrough delivery, with no KV or
image transformation binding provisioned. Only a deployment dry-run command is supplied; release approval remains separate.

## Runtime ownership

SiteLayout owns the document, metadata and a route slot. It imports the native Astro AppTray,
never the main experiences. Home, profile and leaderboard each import one main
island; About imports none and ships no Solid runtime. Home/About prerender. Profile and leaderboard render
on demand. Home, About, the shared tray and the complete profile preserve the existing
DOM/CSS geometry. Leaderboard preserves the existing Board and NavWell geometry.

All island first renders are synchronous. `onMount` starts product loading;
`onCleanup` aborts requests and removes listeners. Each `createProduct` instance
belongs to one product owner, with pending/success/empty/error states, explicit
retry, a 15-second browser deadline, superseding-request abort and a generation
guard against late writes. Clearing comparison cancels and empties its resources.
There is no global product cache or application router.

`createUrlState` reads the initial query from page props, restores location on
mount/popstate, and uses replaceState without erasing unrelated history fields.
It is a seam for the existing profile/board parsers, not their replacement.

## Transport and identity

`GET /api/vibe?sport=nba&type=player&id=177` is the representative profile product
route. Sport/type/id are required, allowlisted, unique and validated; extra
query parameters are rejected. The upstream origin is fixed to
`https://api.scoracle.com/api/v1`. Browser headers and credentials are never
forwarded. The internal key comes only from `cloudflare:workers` bindings.
Redirects are manual and treated as errors, preventing credential forwarding.

A 12-second default deadline includes body parsing and composes with request
cancellation. Upstream 404 becomes JSON null (empty); upstream error statuses
remain errors; transport/JSON failures return 502 and deadline expiry 504.
Cached non-404 upstream errors get one uncached recovery attempt. All endpoint
responses are no-store; the upstream cache policy retains 300-second success
caching and excludes errors. This read returns only public product data.

Profile identity reads bundled assets through ASSETS using the page's origin
(required by the development binding), then reuses the existing pure resolver.
Unknown identities return 404; asset/JSON failures return uncached 503. Full maps
never enter island props. The selected resolved identity supplies its image,
team link and name synchronously. Astro renders the first six details into the
`details` slot; the profile route owns the outer deck geometry and noscript copy. The existing blurb and tab
parser supply description/OG/Twitter metadata and slugged canonical URLs, including
legacy tab aliases and omission of the default tab. An optional fixed-origin meta
read supplies the validated palette with a 1.5-second deadline and neutral fallback.

`npm run cf:types` generates binding declarations from Wrangler. A local real-key
read can use ignored `.dev.vars`; never commit credentials. The initial
real-product proof used the public endpoint without a production key. Tests
verify synthetic server-key forwarding and browser credential exclusion.

## Stable Solid lifecycle

Islands render synchronously, load products on mount and dispose them on cleanup.
Context uses `Context.Provider`; DOM APIs come from `solid-js/web`. Async memos,
Loading/Errored, server functions and application-router APIs are absent. Runtime
tests cover races and cancellation; `verify:build` checks route separation and
absence of server transport markers in shipped JavaScript.

## Static shell and home

SiteLayout retains `#app > main` geometry, shared CSS/fonts, pre-paint theme,
static atmosphere (with optional palette), metadata and the trademark footer.
About contains the complete existing legal/contact copy and anchor sections.
Astro middleware reuses the existing response policy; `public/_headers` supplies
matching security/cache headers for prerendered documents, which bypass it.
Cloudflare `html_handling: drop-trailing-slash` and Astro `trailingSlash: never`
keep `/about` canonical without an extra navigation. Legacy information routes
redirect to the matching About anchor. Profile redirects and canonical aliases
are checked by the preview suite.

AppTray receives pathname, sport and a small current-entity descriptor. It never
fetches identity. Browser mount restores `scoracle.trayExpanded`,
`scoracle.recentEntities` and `scoracle-theme`; storage failure is safe and invalid
recent records are ignored. Theme and settings listeners are disposed with the
tray custom element on disconnect. Initial SSR is always collapsed with no stored recents. Expansion overlays
the page. Leaderboard publishes its selected sport through a browser-only getter/subscription.
AppTray subscribes on mount and disposes its listener; either tray connection / island hydration order works.
Server rendering never writes shared sport state.

The Home Astro route supplies the original ball/fog/logo as the `artwork` slot.
HomeExplorer retains the mover lifecycle, gestures and independent SearchBar. It starts
one `/api/home-movers` read while SearchBar independently loads the versioned
bundled universal directory. Search is disabled until the directory is usable;
failed reads show local Retry. Movers never gate search. The endpoint accepts no
query arguments and preserves the existing 12-read server fan-out, sport order,
partial success and empty/failure fog fallback through the shared pure
`readHomeMovers` helper. No new product is derived. Both reads abort on disposal.
The pure directory parser/search matching preserves existing search behavior.
The live reading has a 200ms arrival reveal, disabled under reduced motion along
with the existing mist/carousel motion. Native links handle pointer navigation;
keyboard selection uses a document navigation.

Presentation source, CSS and pure helpers now live together under `src/`.
There are no duplicate JSX implementations or runtime-resolution boundaries.

Run `node tests/runtime/preview.mjs` against a running production preview on 4322
(or pass its origin) to check static/dynamic headers, statuses and redirects.
`verify:build` also checks useful initial home markup, full About content, route
isolation and static CSP parity. Runtime UI checks use Chrome DevTools MCP.


## Profile product ownership

`createProfileProducts` belongs to one profile island. Cards, score ring,
membership and conditions consume the same synchronous result accessors.
Eight independent primary requests start on mount; no card or score consumer
fetches on its own. No application-wide cache or router is involved.

| Owner / endpoint | Key | Consumers |
| --- | --- | --- |
| stats | sport/type/id/season | Profile chart, rating head, season team, Scout score, Momentum events, conditions |
| report → rating | sport/type/id/season | Scouting prose/membership |
| news | sport/type/id | Narratives body/score/membership |
| transfers | sport/type/id | Transfers body/score/membership |
| vibe | sport/type/id | Vibe body/heat/membership |
| momentum | sport/type/id/season | Momentum sentiment series/membership |
| summary → momentum/summary | sport/type/id/season | Momentum prose/normalized score/membership |
| sigil | sport/type/id | Sigil current/heat/archetype/membership |
| comparisonStats → stats | sport/type/vs/season | Butterfly chart |
| comparisonMeta → identity | sport/type/vs | Comparison name/control |

The endpoint parser rejects unknown products, extra/duplicate arguments, unsafe
IDs and invalid seasons. Season is accepted only on the four seasonal products.
`identity` resolves one bundled identity; `teams` returns only the selected sport's
team map for comparison search details. Both use ASSETS and propagate outages.
All responses retain no-store policy. Credentials remain in the shared fixed-origin
server transport; no arbitrary proxy or aggregate profile endpoint exists.

Primitive season/vs keys are memoized before request effects. A new query-string
value is not necessarily a new product key: tab, scope, rate and model never fetch.
A season change reads four primary products plus selected comparison Stats;
changing vs reads only comparison Stats/identity. Clearing vs aborts both.
Comparison search starts the versioned sport directory and narrowed team metadata
when first opened, retaining them within the profile owner across popover/tab changes.

The pure `deck-presence` predicates and `stats` transforms serve all profile
consumers. Initial membership waits for all primary owners to
settle, bounded by server/body and browser deadlines, while identity stays visible.
A failure retains a retryable seat; an empty result does not. The selected card
survives empty conditions until the reader selects another card. Missing scores
omit ring slots; measured zero remains visible. Retry touches only failed owners.

ReadingTable keeps dealt panes mounted across selection. Tab/edge/swipe navigation
changes visibility; hidden faces are inert. Conditions use the existing Select and
Disclosure presentation; NavWell reserves its original conditions row. Chart
measurement and popup listeners dispose with their owners. Zoom lifts the same
node, preserves internal scroll, inerts the background and locks document scroll.
Back, Escape and backdrop dismissal consume the same-URL lift history entry,
restore focus and unlock the page. Unmount aborts work and removes listeners,
inert attributes, scroll locks and the lift marker. URL replacement preserves
unrelated history state; canonical/OG URLs track the normalized active tab.

Before initial product settlement, an invisible, noninteractive rail and the same
deck-stage geometry reserve the card and footer positions. Score-ring labels still
redistribute as available scores arrive; this can produce measurable mobile layout
shift even when the surrounding shell stays fixed.

`tests/runtime/profile-arrival.js` is a diagnostic initializer for Chrome DevTools
`navigate_page.initScript`. Call `observeProfileArrival(products)` with a frozen map
of the eight profile endpoint bodies. It staggers browser responses, records each
owner's start, ring positions and layout-shift sources, and distinguishes chart/deck
DOM readiness from the next rendering opportunity. Neither timestamp proves paint.
The initializer is test-only and does not intercept server-side reads; it cannot
establish legacy SSR parity, deployed throughput or edge caching. The browser
arrival tests validate the probe, real zero scores and the approved evenly spaced
final ring at desktop/mobile widths. They do not declare a CLS release threshold
passed. Preserve missing-score omission and independent arrivals when investigating
the ring; a cosmetic transform that removes CLS accounting would still move labels.

The navigation browser check disables Chromium's BFCache and exercises native
player/team Back/Forward focus, theme persistence and the About privacy anchor.
Shared Astro history-focus behavior now stores the departing link on the current
history entry, preserving other state and distinguishing tray duplicates. On a
non-BFCache history load it waits for island hydration, focuses without scrolling,
and stops on user interaction, departure or a ten-second deadline. Fresh loads,
reloads and BFCache restores retain browser behavior. The former expected failure
is now a normal assertion. The Playwright projects cover Chromium, Firefox and
WebKit; use `--project=chromium` for a targeted run. Real-device Safari and explicit
BFCache-hit evidence remain separate checks.

`tests/runtime/profile-browser.js` is an assertion function for Chrome DevTools
`evaluate_script` on a loaded multi-card profile (pass its text inline when MCP's
sourcePath roots exclude the checkout). It checks zero-fetch tab changes, mounted
panes, inert faces, history state and all three zoom dismissal paths with focus.
Runtime tests additionally cover keyed request counts, cancellation, deadlines,
late writes, empty/zero/error and transport validation. Preview tests cover the
product-free identity shell, canonical aliases, statuses, redirects and identical
browser/crawler documents. Final release performance and deployed binding/cache
validation remain separate from this local runtime contract.


## Leaderboard ownership and navigation

`LeaderboardExplorer` owns Board, NavWell, all filters and its request collection.
The pure `board-query` parser retains aliases, facet labels and canonical
URLs across server metadata and browser controls. Astro renders the selected heading, metadata, controls and
unwritten register synchronously; live rows require JavaScript. Invalid sports
fall back to NBA, and numeric scopes must be positive safe integers.

`/api/board` validates unique, allowlisted, canonical arguments before using the
existing server transport. Rating/fantasy preserve composite/fantasy scope,
season, cohort and rating's player rate; Sigil preserves season/cohort;
Vibe/Narratives/Momentum preserve cohort and Momentum's metric. Transfers accepts
only sport/team. Limit stays 50. `/api/board-options?sport=…` reads bundled assets
and returns only teams and derived position groups, never the player map.
Both endpoints are no-store and preserve explicit failures.

The pending board reserves 50 ranks, matching the endpoint limit, so its foot does
not jump out of the initial viewport when a full register arrives. Empty and shorter
results still shrink to their actual content.

On mount the active board, five default visible boards and sport options start
independently. Identical active/warm keys share pending and completed results.
Only effective endpoint arguments enter keys; unrelated URL fields never fetch.
Completed board results remain within this experience until unmount. Pending
reads outside the active/current warm set are disposed and removed. Each entry
uses `createProduct` deadlines and generation guards. Disposal aborts all pending
work and clears the collection; there is no cross-page cache. A failed board or
options read retries only itself. Empty rows and measured zero remain distinct.

Hierarchy controls retain narrowing and dependent-filter resets. Native links
own page changes; query changes replace history while preserving unrelated state.
Popstate restores selections, metadata and tray sport. The pre-paint theme and
stored tray posture/recents carry across documents. Chrome checks establish
board-to-profile Back/Forward focus and scroll restoration, keyboard search to
profile, profile-to-team links and About anchors. Desktop (1440×1000) and mobile
(390×844, DPR3, dark/reduced motion) board geometry matches the live reference.
No observed regression required an Astro client router. Broader browser and
matched release performance acceptance remain Step 7.

`tests/runtime/board-browser.js` runs through Chrome DevTools `evaluate_script` on
an NBA/NFL board. It temporarily injects football fixtures and disposes the board
island at the end; reload afterward. It asserts independent readiness, warming,
local retries, stale response protection, zero/empty states, the browser deadline,
unmount cancellation and history preservation. `board.test.ts` checks keys,
transport validation, owner reuse/disposal and both sport subscription orders.
`preview.mjs` checks board shells, aliases/canonicals, browser/crawler parity,
endpoint rejection and narrowed option responses.


## Furniture boundary

Astro slots use the integration's display-contents wrapper; existing classes,
CSS ancestry and product mount order are preserved. Static details and Home
artwork have no Solid hydration keys or client render functions. Build checks
assert that their markup is absent from the route entry scripts; browser checks
cover slot layout alongside live team refinement, image fallback and discovery.

Product-dependent rails/markers and conditions remain inside the Card/deck and
Board islands. A measured Astro/native Board rail pilot added coordination with
no useful route saving and was discarded. Static composition does not warrant a
second URL owner or a general island bridge. Image fallback remains within the
existing Card island; stats can still update team membership. All eight profile
owners, ring/deck sharing, retained panes and zoom lifecycle are unchanged.
