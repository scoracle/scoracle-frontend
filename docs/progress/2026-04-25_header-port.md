# Header port + global app-level integration

**Date:** 2026-04-25
**Scope:** Phase 3b, Commit B. Port `Header.tsx` + `.css` from `~/Scoracle`. Integrate at the app level so it renders on every route, with `showSearch` driven by URL (hidden on `/`, shown elsewhere). Two SSR-correctness fixes lit up by the integration.

## Goal

Close out Phase 3b by adding the sticky header with hamburger menu, search, theme toggle, and home button — the visual chrome that wraps every page except home (where CrystalBall provides its own search and the SCORACLE editorial headline owns the top of the viewport).

## What Was Done

### Header port

`src/components/solid/Header.tsx` + `.css` — copied verbatim from `~/Scoracle/src/components/solid/`. Same structure: `<details>`/`<summary>` hamburger, three menu sections (nav, language select, theme toggle), conditional search slot, home button. Stores theme in `localStorage` under `scoracle-theme` (matches the Astro Layout's pre-paint script).

### App-level integration

`src/app.tsx` — Header now renders inside the `Router root` slot, above the `Suspense`-wrapped route children. A small `HeaderForRoute` wrapper uses `useLocation()` from `@solidjs/router` to compute `showSearch`:

```tsx
function HeaderForRoute() {
  const location = useLocation();
  return <Header showSearch={location.pathname !== "/"} />;
}
```

Hides search on `/` (CrystalBall owns search there); shows everywhere else. Avoids per-route boilerplate; route components stay focused on content.

### Two SSR fixes

**1. `onCleanup` runs on the server.**
First dev-boot attempt crashed with:

```
ReferenceError: document is not defined
    at /home/sheneveld/scoracle-frontend/src/components/solid/Header.tsx:76:5
    at cleanNode (.../solid-js/dist/server.js:132:68)
```

Solid SSR runs `onCleanup` callbacks during component teardown at the end of render — even though `onMount` only runs on the client, `onCleanup` fires on both. Header's cleanup body referenced `document.removeEventListener`, which is undefined on the server.

Fix: import `isServer` from `solid-js/web` and guard the cleanup body:

```ts
onCleanup(() => {
  if (isServer) return;
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onDocumentKeydown);
});
```

Pattern to remember: **any `onCleanup` that touches browser globals needs an `isServer` guard.** `onMount` does not (it never runs on server). Audit candidate for future component ports.

**2. `/** @jsxImportSource solid-js */` directive triggered an esbuild warning.**

The directive was a 1.x-era IDE hint. In SolidStart 2.0-alpha (pure Vite), `vite-plugin-solid` handles JSX transformation directly — the directive conflicts with esbuild's automatic-JSX expectations and emits:

```
The JSX import source cannot be set without also enabling React's "automatic" JSX transform
```

Removed the directive from `CrystalBall.tsx` and `Header.tsx`. (`SearchBar.tsx` was already written without it during Commit A.) Pattern to apply going forward: **don't carry `@jsxImportSource` directives over from the Astro repo when porting components**; vite-plugin-solid handles transformation without the hint.

## Files Changed

Added:
- `src/components/solid/Header.tsx`, `Header.css`
- `docs/progress/2026-04-25_header-port.md` (this file)

Modified:
- `src/app.tsx` — `HeaderForRoute` wrapper + global Header render via Router root.
- `src/components/solid/Header.tsx` — removed `@jsxImportSource` directive; added `isServer` guard to `onCleanup`.
- `src/components/solid/CrystalBall.tsx` — removed `@jsxImportSource` directive.

## Verification

`npm run typecheck` → clean. `vite dev` → boots in ~264 ms, no warnings beyond Node's `--localstorage-file` noise.

| Path | Status | Bytes | Header in SSR HTML | Search slot in SSR HTML |
|---|---|---|---|---|
| `/` | 200 | 17887 | yes | **no** (correct — CrystalBall has its own) |
| `/profile` | 200 | 16939 | yes | yes |
| `/terms` | 200 | 17050 | yes | yes |
| `/no-such-route` | 200 | 16945 | yes | yes |

Bytes ~3× the home-only sizes from earlier — Header chrome (hamburger + menu dropdown + theme toggle + SearchBar autocomplete shell) adds significant surface area.

### Caveat — sport-store hydration flicker (not blocking)

`stores/sport.ts > readPersistedSport()` reads `sessionStorage`/`localStorage` in a try/catch at module-load. On the server, the catch returns `'nba'`. On the client, it returns the persisted value. If the client has e.g. `'football'` stored, the SSR HTML renders with `'NBA'` content (search placeholder) and re-renders to `'Football'` after the atom updates post-hydration. Solid doesn't hard-error on this; it's a brief content swap.

If the flicker becomes user-visible, fix later by initializing the atom to `'nba'` synchronously and hydrating from storage in an explicit `hydrateCurrentSport()` called from `app.tsx` `onMount`. Not doing it now since the visible impact is sub-perceptible and the simpler current code matches the Astro pattern.

## Result

Phase 3b is done. Home page, profile, terms, and 404 all render the SolidStart-native chrome (Header at top, route content below) with no SSR errors, no JSX warnings, and full Phase 3a plumbing exercised through real consumer components for the first time.

Two SSR patterns established that will help future ports:
- `onCleanup` bodies that touch browser globals need `isServer` guards.
- Drop `@jsxImportSource` directives during port — vite-plugin-solid handles JSX without them in 2.0-alpha.

Next: end-of-phase **Astro residue audit** across the whole `scoracle-frontend` tree — verify nothing Astro-specific snuck in via the bulk component ports.
