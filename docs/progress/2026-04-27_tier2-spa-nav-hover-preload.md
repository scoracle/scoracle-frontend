# Tier 2: SPA navigation via `<A>` + `useNavigate` + hover-preload

**Date:** 2026-04-27
**Scope:** The third recommendation from the optimization roadmap. SearchBar's `window.location.href` swap is replaced with the router's client-side transition primitives so search → profile becomes an instant SPA route change with the data already in flight.

## Goal

Profile-to-profile is a real near-future flow (per user note 2026-04-27 — image+link share cards land on a profile and click through to other entities). Every search-result click currently does `window.location.href = '/profile?...'` — a full page reload. Tier 2 turns that into a client-side route transition, paired with SolidStart's `preload` hover hook from Tier 1 so the route's `query()` cache is already warm by the time the user clicks.

## What Was Done

### `src/components/solid/SearchBar.tsx`

- Imported `<A>` and `useNavigate` from `@solidjs/router`.
- Added a `profileHrefFor(entity)` helper that builds the destination URL once, used by both the rendered `<A>` and the keyboard-Enter path.
- Each suggestion is now an `<A href={profileHrefFor(entity)}>` instead of a `<button onMouseDown={selectEntity}>`. SolidStart sees the `<A>`, fires the route's `preload` export on hover/focus → `getNews/getStats/getVibe/getTwitterFeed` queries warm the cache. Click → instant client-side transition with data already there.
- Modifier-key behavior comes back for free: Ctrl-click and middle-click open the profile in a new tab; copy-link-address works.
- The keyboard-Enter handler calls `useNavigate()(profileHrefFor(...))` instead of `window.location.href` — same client-side path, no full reload.
- The old `selectEntity` function survives for the keyboard path, but its body is now a one-line `navigate(...)` call.

### `src/components/solid/SearchBar.css`

`.search-suggestion-item` was a `<button>` (no underline). After the `<A>` swap, anchor's default `text-decoration: underline` would draw under each suggestion. Added `text-decoration: none` to the rule. Visual is byte-identical to before.

## Files Changed

**Modified**
- `src/components/solid/SearchBar.tsx` — `<A>` + `useNavigate`, profileHrefFor helper
- `src/components/solid/SearchBar.css` — `text-decoration: none` on suggestion items
- `docs/progress/2026-04-27_tier2-spa-nav-hover-preload.md`

## Verification

- `npm run typecheck` — green.
- `npm run build` — green.
- `npm test` — 67/67 passing.
- Manual (browser, after `cf:deploy` or local dev): typing a search term, hovering a suggestion, then clicking → DevTools Network tab shows no document load on click; the only network activity is the server-fn POST(s) to `/_server?id=...` triggered by the hover preload. Combined with Tier 1's streaming SSR cache, those POSTs return cached data instantly on the second hover.
- Keyboard path: arrow-down + Enter on a suggestion follows the same client-side transition path (no full reload).

## Result

- **Profile-to-profile transitions are SPA-instant.** No document re-parse, no full hydration cycle, no skeleton flash.
- **Hover preload flows end-to-end.** Tier 1's `preload` route export now has its trigger; the `query()` cache primes before the click.
- **Modifier keys recover.** Ctrl-click / middle-click / "open in new tab" all work as users expect from any web link — they didn't with `window.location.href`.

The platform-wide pattern lands: every site sharing the Solid component library will use `<A>` for in-app routing, `useNavigate` for the keyboard/programmatic path, and `preload` for cache-warming. No bespoke navigation primitives.

## Wrap-up: optimization roadmap status

All four roadmap recommendations from the strategy plan are done:

| Tier | Title | Status |
|---|---|---|
| 1 | `query` + `createAsync` + `"use server"` + streaming SSR | ✅ |
| 2 | `<A>` + `useNavigate` + hover preload | ✅ |
| 3 | `prefers-reduced-motion` across animation sites | ✅ |
| API-side | `AllowOriginFunc` + no-Origin smoke probe (in `~/scoracle-data`) | ✅ |

Outstanding (not in this repo):
- **Cloudflare WAF triage** on `api.scoracle.com` — the user's dashboard step. Until done, the production deployed worker's SSR fetches 403 and the client retries (graceful degradation, same UX as before Tier 1). Once exempted, the production SSR streams content the same way local dev does today.
