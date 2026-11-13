# Astro runtime contracts

`astro/` isolates stable Solid from the existing root Solid 2 RC application.
It owns its package lock, TypeScript settings, Astro config and local Worker
name. Shared pure identity/statistics/membership helpers, product response types, global CSS and public
assets remain authoritative in the root. The migration plan owns progress and
removal of this temporary package boundary; this document describes the runtime.

## Supported dependency set

Verified against npm manifests, installed sources, Astro checks and a real
Cloudflare workerd build/preview on 2026-11-12:

| Package | Pin / locked version |
| --- | --- |
| Astro | 7.4.11 |
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
image transformation binding provisioned. No deployment command is supplied.

## Runtime ownership

SiteLayout owns the document, metadata and a route slot. It imports AppTray,
never the main experiences. Home, profile and leaderboard each import one main
island; About imports none. Home/About prerender. Profile and leaderboard render
on demand. Home, About, the shared tray and the complete profile preserve the existing
DOM/CSS geometry. Leaderboard remains a scaffold.

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
team link, name and first six details synchronously. The existing blurb and tab
parser supply description/OG/Twitter metadata and slugged canonical URLs, including
legacy tab aliases and omission of the default tab. An optional fixed-origin meta
read supplies the validated palette with a 1.5-second deadline and neutral fallback.

`npm run types` generates binding declarations from Wrangler. A local real-key
read can use ignored `astro/.dev.vars`; never commit credentials. The initial
real-product proof used the public endpoint without a production key. Tests
verify synthetic server-key forwarding and browser credential exclusion.

## Solid 2 API ports required for existing components

| Existing RC idiom | Stable integration port |
| --- | --- |
| async createMemo, ssrSource/loadingValue | synchronous shell plus browser-owned product state |
| Loading / Errored | local Show/Switch and explicit error/retry state |
| reactive createSignal initializer | stable initial value; explicit memo/effect for derivations |
| two-callback createEffect | stable createEffect with explicit dependencies where needed |
| onSettled returning cleanup | onMount / onCleanup |
| context callable provider | Context.Provider |
| JSX/web imports from @solidjs/web | JSX types from solid-js; DOM APIs from solid-js/web |
| router query/useSearchParams/navigation | endpoint fetches, local URL seam, native links |
| meta components/document SSR | Astro metadata/layout |

Port each component deliberately; do not merely rename imports. Stable Solid's
lifecycle has been tested through Astro hydration and its renderer unmount event.
`npm test` covers transport and resource races; `npm run verify:build` checks
route separation and absence of server transport markers in shipped JavaScript.

## Static shell and home

SiteLayout retains `#app > main` geometry, shared CSS/fonts, pre-paint theme,
static atmosphere (with optional palette), metadata and the trademark footer.
About contains the complete existing legal/contact copy and anchor sections.
Astro middleware reuses the existing response policy; `public/_headers` supplies
matching security/cache headers for prerendered documents, which bypass it.
Cloudflare `html_handling: drop-trailing-slash` and Astro `trailingSlash: never`
keep `/about` canonical without an extra navigation. Legacy information routes
redirect to the matching About anchor. Profile redirect/canonical parity will
receive its complete audit during the profile port.

AppTray receives pathname, sport and a small current-entity descriptor. It never
fetches identity. Browser mount restores `scoracle.trayExpanded`,
`scoracle.recentEntities` and `scoracle-theme`; storage failure is safe and invalid
recent records are ignored. Theme and settings listeners are disposed with the
island. Initial SSR is always collapsed with no stored recents. Expansion overlays
the page. Live leaderboard-to-tray sport subscription belongs to the board port,
where that selector first becomes interactive.

HomeExplorer renders the original ball/fog and SearchBar synchronously. It starts
one `/api/home-movers` read while SearchBar independently loads the versioned
bundled universal directory. Search is disabled until the directory is usable;
failed reads show local Retry. Movers never gate search. The endpoint accepts no
query arguments and preserves the existing 12-read server fan-out, sport order,
partial success and empty/failure fog fallback through the shared pure
`readHomeMovers` helper. No new product is derived. Both reads abort on disposal.
The existing directory parser/search matching is shared with the retained runtime.
The live reading has a 200ms arrival reveal, disabled under reduced motion along
with the existing mist/carousel motion. Native links handle pointer navigation;
keyboard selection uses a document navigation.

Stable JSX ports live under `astro/src/components` temporarily so their compiler
and runtime cannot resolve to the root RC installation. CSS, assets, identities,
directory parsing and movers composition remain shared. Consolidate the component
copies with the package boundary when retiring the old runtime.

Run `node astro/tests/preview.mjs` against a running production preview on 4322
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

The shared pure `deck-presence` predicates and `stats` transforms are also used by
the retained application. Initial membership waits for all primary owners to
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

Stable JSX copies stay under `astro/` until Step 6 consolidates the package/runtime
boundary. No Solid 2 router, RPC or async rendering imports enter the Astro profile.
`astro/tests/profile-browser.js` is an assertion function for Chrome DevTools
`evaluate_script` on a loaded multi-card profile (pass its text inline when MCP's
sourcePath roots exclude the checkout). It checks zero-fetch tab changes, mounted
panes, inert faces, history state and all three zoom dismissal paths with focus.
Runtime tests additionally cover keyed request counts, cancellation, deadlines,
late writes, empty/zero/error and transport validation. Preview tests cover the
product-free identity shell, canonical aliases, statuses, redirects and identical
browser/crawler documents. Final release performance and deployed binding/cache
validation remain separate from this local runtime contract.
