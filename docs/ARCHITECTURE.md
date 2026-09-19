# Architecture

Solid 2.0.0-rc.8 on Cloudflare Workers, using @solidjs/web, router 2.0.0-next.24, meta 1.0.0-next.2 and the native Vite plugin 3.0.0-next.35. Vite is pinned to 8.3.0. The plugin owns SSR, server functions and compilation; `worker.ts` owns the Cloudflare host seam.

## Rendering and navigation

Every initial request, browser or crawler, receives the same complete awaited HTML. `src/entry-server.tsx` awaits `renderToStream`; route metadata and product content settle before the response is sent. There is no user-agent rendering branch. `Document.tsx` owns static document structure and bootstrap; @solidjs/meta owns site defaults and route overrides.

Client navigation uses `<Loading on={location.pathname}>` in the page frame, with entity/scope keys on nested boundaries. Pending incoming routes show their skeleton immediately. Previously loaded tabs reuse their mounted card and cached product. The final profile rail is derived from all membership predicates, so the dealt layout appears together rather than shuffling as individual products resolve.

## Eager data ownership

`src/lib/data/profile-data.ts` defines the arguments for every profile read once: sport, entity type/ID, season, news scope, archive week and comparison. Intent preloading and mounted consumers call those same functions. `query()` owns request deduplication, hydration reuse and revalidation. No parallel application cache or promise registry exists.

Each consuming card, score or control owns an async `createMemo` inside the `Loading` and `Errored` boundary that must recover it. Do not hoist a failing memo above that owner merely to share it: the query cache already shares its request. The profile headline rating, each ring score and the control line have independent boundaries. Failed cards remain reachable to show an error and retry using query revalidation and native boundary reset.

`CARD_REGISTRY` declares card identity and controls. `deck-content.ts` declares whether a character has anything to say; each predicate starts eagerly. Failure retains a card so retry is available. A card held during a conditions change retains its seat until the reader moves on. That is product behavior, not a loading state machine. Archive mode fetches its archive instead of unrelated live readings.

Every dealt card mounts eagerly through SSR and hydration. Tabs, swipes and card edges change visibility. Rate, season and comparison changes select new query keys; Solid owns pending and superseded computations. Search directories use `ssrSource: "client"`; team metadata is narrowed server-side so whole player maps do not inflate document hydration payloads.

The six ring scores render independently. CSS places the available slots around the crest, including after a failed score disappears or recovers. Explicit text formatting retains a score of zero. There is no aggregate async score read or hand-written NotReadyError handling.

## Transport and Workers

Every product fetch uses `fetchJsonOrNull`. The twelve-second deadline includes body consumption, and request cancellation propagates through the combined abort signal. Missing optional products (404) return null. Rate limits, network failures and 5xx responses mark the document 503/no-store; other failures use 502/no-store. Metadata failure retains the default curtains.

The Worker calls the built `handleRequest(request, { event: { locals: { cloudflare: { env, ctx } } } })`. Bindings remain on Solid's request-local event during both SSR and server-function RPCs. Generated `worker-configuration.d.ts` describes the actual configuration.

- ASSETS serves bundled metadata inside the Worker; never fetch the public site itself for those files. Node development reads `public/data` from disk. Asset paths are constrained to known JSON filename shapes.
- `SCORACLE_INTERNAL_KEY` supplies the internal Go API header and remains server-only. It exempts Worker traffic from shared-IP rate limiting. Wrangler retains the existing required secret during deployment.
- Successful API responses use the existing 300-second Cloudflare TTL; redirects and failures cannot enter that cache. An explicitly cached error from an old release gets one uncached recheck. Live failures never loop.
- Public document responses retain max-age=300/stale-while-revalidate=600. The Worker cache includes the deployment version and every content-selecting query parameter, while dropping tracking parameters. Errors, redirects, RPCs, cookie-bearing and authenticated requests bypass shared document caching. Only public HTML 200 responses without Set-Cookie are inserted.
- Existing CSP, security headers, theme initialization, favicon, brand unfurls and AdSense loader remain. Local-only noindex tags are absent from production.

HTTP deadlines, cache rules, persistence, domain membership rules and animation timing remain explicit. Solid reactivity does not replace them.

## Pages and artifacts

Home is the wordmark, crystal ball and universal search. `/profile` is the browse directory. Entity profiles use path identity with scoped search parameters; legacy query links redirect permanently. `/leaderboard` holds the Stories, Scouting, Narratives, Vibe, Momentum and Sigil tabs, with sport/cohort/scopes in its conditions line. Story details and static legal/about/contact pages share the same router.

The Card is the profile artifact; the Board is the ranked discovery artifact; NavWell owns their selection controls. PageAtmosphere supplies fixed curtains and canonical team colors. Profile and ReadingTable retain the portrait card, pile, zoom, focus and mobile behavior. Sharing remains parked behind `CARD_SHARING_ENABLED`; the existing capture implementation is retained.

## Dependency correction

`patches/solid-web-rc8-serialized-rejection.patch` corrects two RC8 renderer promise lifecycles. The serialized race and buffered fragment are observed immediately, so an early rejection cannot terminate the server while its serializer is pending. Their original rejections still reach native boundaries. `postinstall` applies the patch idempotently with exact version/source checks; `verify:build` checks it. There is no global unhandled-rejection handler. Reassess/remove the correction when upgrading Solid.

The private package registry credentials currently cannot read @scoracle/tokens. The manifest explicitly uses `file:../scoracle-tokens`, matching the existing development checkout. Keep the sibling's built 0.20.0 package available; restore a registry pin when package-read credentials are repaired. The release uses the reviewed runtime artwork and bundled data. Studies under `local/design`, `work`, and the local Solid experiments are not deployment inputs.

## Verification and release

Run `npm run typecheck`, `npm test`, `npm run cf:build`, `npm run verify:build`, and `npm run verify:ssr`. Unit tests use Solid 2's compiler/render/flush APIs and DOM Testing Library; routing tests use the new router factory and memory history. SSR fixtures assert real content, initial metadata, browser/crawler parity, internal-key forwarding, safe cache TTLs, 404s, rate-limit/failure responses and recovery.

Keep the archbox loopback tunnel on port 18000 open for `npm run test:browser`. The suite starts a local fault proxy and its own preview. `SCORACLE_TEST_WORKERS=1 npm run test:browser` runs the same suite in workerd through the actual Worker entry. Fault controls stay local; successful real API responses are reused by the test proxy to avoid exhausting its limiter. A test cookie bypasses document caching; cache tests use anonymous requests separately. Third-party ad delivery is excluded from application regression tests.

Before release, run `wrangler deploy --dry-run`. After deployment, `npm run verify:live` requests fresh production documents and rejects error content. Keep the previous Cloudflare Worker version as rollback until live checks pass. Release history belongs in `scoracle-wiki/progress_docs/scoracle-frontend`, not this repository.
