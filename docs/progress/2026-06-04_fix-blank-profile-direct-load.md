# 2026-06-04 — Fix blank profile on direct / shared-link load

## Goal

Clicking a shared OG link landed on `/profile` and rendered blank — header + footer
present, the whole `<main>` empty — and the header search showed a "random" sport. Fix it.

## Diagnosis

- **SSR is correct.** Curling the exact shared URL returns a fully-populated `<main>` (33 KB:
  `pw-name">Savinho`, all three score labels, the card labels). So the failure is **client
  hydration**, not SSR: header + footer (root layout) survive while the route subtree under
  the **fallback-less** root `<Suspense>` blanks — the signature of an uncaught client
  exception / hydration desync in the route.
- **Root cause (primary suspect):** `stores/sport.ts` initialized `$currentSport =
  atom(readPersistedSport())`, reading `sessionStorage`/`localStorage` **at module-eval**.
  On the server that throws → `'nba'`; on the client it seeds the *persisted* sport. So the
  very first hydrated node (the header SearchBar placeholder) diverges SSR vs client — and
  Solid hydrates the DOM in order, so an early mismatch can desync the walk and blank what
  follows (the `<main>`). It also explains the "random sport": the profile never set the
  sport from its URL, so the search showed whatever was persisted.

## What Was Done

- **SSR-safe store** (`stores/sport.ts`): `$currentSport` inits to a constant `'nba'`; no
  storage access at module load. (`setSport` still write-throughs to storage.)
- **Profile pins its sport** (`profile.tsx`): `onMount` calls `setSport(urlSport)` so the
  header search reflects the profile's sport — post-hydration, so no mismatch. Fixes "random
  sport".
- **Root resilience** (`app.tsx`): wrapped the route children in an `<ErrorBoundary>` with a
  graceful fallback. A route-level client error now degrades to a message (and surfaces it)
  instead of a silent blank under the fallback-less Suspense.

## Files Changed

`stores/sport.ts`, `routes/profile.tsx`, `app.tsx`.

## Verification

`npm run typecheck` clean; `npm test` 97/97; `npm run build` clean; SSR still renders full
`<main>` (curl). Client/shared-link load verified on device post-deploy.

## Result

The SSR/client store divergence is removed, the profile pins its own sport, and an
ErrorBoundary backstops the route. Expected: shared links render the full profile; the header
search shows the correct sport. If any residual client error remains, it now shows instead of
blanking — which pinpoints the next fix.
