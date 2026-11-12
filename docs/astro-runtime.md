# Astro runtime contracts

`astro/` isolates stable Solid from the existing root Solid 2 RC application.
It owns its package lock, TypeScript settings, Astro config and local Worker
name. Shared pure identity helpers, Vibe response types, global CSS and public
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
on demand. Scaffold markup is deliberately incomplete; existing root pages
remain the visual and interaction reference until their planned ports.

All island first renders are synchronous. `onMount` starts product loading;
`onCleanup` aborts requests and removes listeners. Each `createProduct` instance
belongs to one product owner, with pending/success/empty/error states, explicit
retry, superseding-request abort and a generation guard against late writes.
There is no global product cache or application router.

`createUrlState` reads the initial query from page props, restores location on
mount/popstate, and uses replaceState without erasing unrelated history fields.
It is a seam for the existing profile/board parsers, not their replacement.

## Transport and identity

`GET /api/vibe?sport=nba&type=player&id=177` is the single representative product
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
never enter island props. Palette, complete metadata, canonical tab rules and
redirect parity belong to the subsequent profile port.

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
