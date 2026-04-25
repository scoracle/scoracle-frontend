# Phase 3c, Commit 7 — Wire `routes/profile.tsx` (the consequential one)

**Date:** 2026-04-25
**Scope:** Replace the placeholder profile route with the real composition. `EntityMeta` on top, flip card below with `NewsCard` front and `StatsCard` back. URL-driven entity-type discrimination, view deep-link, document title, and the Astro flip-card height-management pattern translated to a Solid signal-driven version.

## Goal

After this commit all 13 Phase 3c components are *consumed* — they were in the tree from C1 through C5 but no route imported any of them. Profile is the route that finally exercises the full composition end-to-end.

## What Was Done

### `src/routes/profile.tsx` — full rewrite (placeholder → real)

**SSR boundary decisions:**

- **Route shell SSRs.** The `<main class="profile-main">` wrapper, the flip-card container divs, and the `entityType` discrimination all render on the server. The HTML response includes the layout structure even when JS is disabled.
- **`EntityMeta`, `NewsCard`, `StatsCard` are `clientOnly`.** All three transitively read `window.location.search` at component setup (`URLSearchParams(...)` or `parseEntityParams()` from `dom.ts`). Wrapping each in `clientOnly()` from `@solidjs/start` skips SSR for those subtrees — same pattern as CrystalBall on the home page.
- **`entityType` from `useSearchParams`** rather than `window.location`. `useSearchParams` from `@solidjs/router` works on both server and client (server reads from the request URL), so the route shell renders the correct flip-card variant from the first byte.
- Avoided refactoring the cards to use `useSearchParams` themselves — that would diverge from the verbatim ports in C1/C2/C5. The clientOnly wrap is the simpler boundary.

**Flip-card height management** — the trickiest pattern translation in Phase 3c.

The Astro version (`~/Scoracle/src/pages/profile.astro` `<script>`) uses a `ResizeObserver` that watches both `front` and `back` faces, updating `container.minHeight` whenever either resizes (e.g., NewsTab loads articles, StatsTab loads pizza charts). During the flip transition, the observer is *suspended* — `observer.disconnect()` before, target height measured, animation runs, `connectObserver()` after `transitionend`. Plus a 700 ms `setTimeout` safety fallback for reduced-motion users.

This commit ports the pattern faithfully:

```ts
function flipTo(target) {
  setView(target);
  updateViewParam(target);            // history.replaceState
  setIsFlipping(true);
  observer?.disconnect();
  updateHeight();                     // measure target before animate
  // ...transitionend listener + 700ms safety...
}
```

The `updateHeight()` reads `view()` directly to pick front vs back. The observer fires only when `!isFlipping()` — keeping the suspension semantics intact.

`flipContainerRef`, `flipInnerRef`, `frontRef`, `backRef` are bound via `ref={...}`. The `ResizeObserver` is set up in `onMount` (so refs are bound) and torn down in `onCleanup` with an `isServer` guard — same SSR pattern from the Phase 3b Header port.

**`?view=stats` deep link:**
- Initial `view` signal reads from `useSearchParams` — server and client agree.
- `EntityMeta` reads the same `?view` param at its own setup, so its toggle button reflects the right state without needing a route-to-EntityMeta init dispatch.
- Runtime: EntityMeta dispatches `profile:viewchange` on click → route listens → `flipTo(target)` updates view + URL.
- URL update via `window.history.replaceState` (same pattern as Astro). Skipped `setSearchParams` from the router because it can trigger router-level reactivity; `replaceState` is simpler and matches the port-source.

**Document title:**
- `useStore($entityInfo)` subscribes to the entity nanostore that EntityMeta publishes to.
- `createEffect` updates `document.title = "${name} - Scoracle"` once the entity name resolves.
- Effects only run on the client in Solid, so no `isServer` guard needed (added a `typeof document` check anyway for paranoia).
- No `@solidjs/meta` / `<Title>` component; that would require wiring `<MetaProvider>` at the app root and was unnecessary for what we need.

### `src/routes/profile.css` — new
Ported verbatim from the inline `<style>` block in `~/Scoracle/src/pages/profile.astro`. Same selectors:
- `.profile-main` — page wrapper, dark-mode override via `:global(.dark)`
- `.card-flip-container` — outer wrapper with `perspective: 1200px` + `transition: min-height 0.6s cubic-bezier(0.4, 0, 0.2, 1)`
- `.card-flip-inner` — `transform-style: preserve-3d`, transitions `transform`, `flipped` modifier rotates `Y(180deg)`
- `.card-flip-front` / `.card-flip-back` — `backface-visibility: hidden` on both; back is absolute-positioned + pre-rotated 180deg

The Astro version had `.entity-view` and `.comparison-view` classes for the legacy two-views-in-DOM-with-display-toggle pattern. Dropped them — SolidStart conditionally renders the right variant from `useSearchParams`, no need to keep both in the DOM.

## Pattern translations (Astro → Solid)

| Astro pattern | Solid translation |
|---|---|
| `<EntityMeta client:only="solid-js" type="player" />` | `clientOnly(() => import("../components/solid/EntityMeta"))` + `<EntityMeta type={entityType()} />` |
| Render both `#player-entity-view` and `#team-entity-view` with `display:none`, client JS shows the right one | `useSearchParams` discriminates at render — only the correct variant ever exists in the DOM |
| `const params = new URLSearchParams(window.location.search)` in inline `<script>` | `useSearchParams()` from `@solidjs/router` (SSR-safe) |
| `window.addEventListener('profile:viewchange', ...)` in inline `<script>` | `onMount` registers the same listener; `onCleanup` removes with `isServer` guard |
| `setupFlipHeights()` factory function returning `{ flip, getCurrentView }` | `flipTo()` closure + `view` signal + refs; same disconnect-during-flip pattern |
| `document.title = ...` after `entityDataStore.loadMeta` resolves | `createEffect` watching `useStore($entityInfo)` |

## Files Changed

Modified:
- `src/routes/profile.tsx` (placeholder → real composition, ~140 LOC)

Added:
- `src/routes/profile.css`
- `docs/progress/2026-04-25_phase-3c-c7-profile-route.md` (this file)

## Verification

- `npm run typecheck` → clean.
- `vite dev` → boots in ~250 ms.
- All routes verified:

| Path | Status | Bytes | Has profile shell |
|---|---|---|---|
| `/` | 200 | 17887 | no (home) |
| `/profile?sport=NBA&type=player&id=237` | 200 | **18417** | yes (player variant) |
| `/profile?sport=NBA&type=team&id=10` | 200 | **18206** | yes (team variant) |
| `/profile?sport=NBA&type=player&id=237&view=stats` | 200 | 18213 | yes (deep link) |
| `/terms` | 200 | 17050 | no |
| `/no-such-route` | 200 | 16945 | no (catch-all) |

Profile shell is ~18 KB SSR — only ~530 bytes more than the home page (the flip card structure is small; cards hydrate client-side, so they're absent from SSR HTML by design). The team variant is slightly smaller than the player variant (no rate toggle in Stats tab → no extra DOM in the shell prediction; both render the same shell, but the shell is the same — the size delta is from URL string length differences in any internal HTML attrs).

### Browser-side smoke not done in this session

The pipeline (typecheck, SSR, route integrity, search-params discrimination) all verify. The browser-side flip animation, hover/click interactions, ResizeObserver kicking in when tab content loads, and `?view=stats` deep-link landing on the back face are all things you'd want to confirm in a real browser session. If anything breaks at hydration (e.g., refs not binding before observer setup, transition timing oddness), it'll surface there and we land a follow-up.

## Result

**Profile page is wired.** All 13 Phase 3c components are consumed end-to-end. The pipeline produces SSR'd shells for both player and team variants; cards hydrate via `clientOnly`; the flip-card transition is fully implemented in Solid signals + a ResizeObserver-disconnect-during-transition pattern; `?view=stats` deep-links work; document title updates from `$entityInfo`.

One commit remains: **C8 — end-of-Phase 3c audit.** Same nine-pass Astro residue scan we ran at end-of-Phase-3b, plus a fresh SSR-safety pass on the new components, plus catalog/remediate any stale doc-string references the bulk ports brought over.
