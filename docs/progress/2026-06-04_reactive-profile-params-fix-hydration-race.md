# 2026-06-04 — Reactive profile params: fix the hydration-race blank (no bandaids)

## Goal

Direct / shared-link loads of `/profile` intermittently rendered blank (header +
footer, empty `<main>`) with the header search stuck on a "random" (default) sport.
Reproduced in headless Chromium (flaky ~80%), independent of cache/extensions/viewport.
Make the route structurally sound.

## Diagnosis (reproduced)

- SSR returns the full page (~42 KB). The blank is **client hydration**: in a failed run,
  `#app` = `<header>` + **`<template>`** + `<footer>` — an *unfilled Solid `<Suspense>`
  placeholder*. No error thrown (ErrorBoundary can't catch it); `onMount` never runs (so the
  sport stays the SSR default → "NBA" on a football page).
- **Mechanism:** the route wrapped `ProfileBody` in `<Show when={routeKey()} keyed>` because
  `ProfileBody` captured `sport/type/id` as non-reactive consts and needed a remount to
  refresh them on (client-side) entity navigation. During hydration, a one-beat change in the
  router's search params flipped `routeKey`, the **`keyed` Show recreated `ProfileBody`
  mid-hydration**, that re-render re-suspended, and the streamed Suspense boundary was left as
  an unfilled `<template>` → permanent blank. A race: win it → fine, lose it → blank. It was
  built home→profile-first, so direct entry was never hardened.

## What Was Done (structural, no bandaid)

- **Reactive params.** `ProfileContext.sport/type/id` are now `Accessor`s (like `season()`
  already was). The route reads them from the URL reactively; Cards' `createAsync` re-fetch
  on entity change with **no remount**. Removed the `<Show keyed>` + the `Profile/ProfileBody`
  split — the route mounts once and hydrates the SSR DOM in place.
- **Season/scope** now derive from the URL (single source of truth); **activeTab** resets to
  the URL's tab via an effect on entity change (replacing the remount's reset). `setSport` +
  `firePreloads` run on mount and re-run on entity change.
- Updated every consumer (`sport` → `sport()` etc.) across the cards, EntityMeta,
  ContentShell, and Card — TypeScript-guided. ContentShell's tab set + Composite/Trends
  labels are now reactive too (player↔team nav updates them in place).

## Files Changed

`contexts/profile.ts`, `routes/profile.tsx` (rewrite), `components/solid/{ContentShell,
CompositeCard,TrendsCard,EntityMeta,VibeCard,NewsCard,SpecialistCard,RosterCard,
TransfersCard,LeaderboardCard,Card}.tsx`.

## Verification

`npm run typecheck` clean; `npm test` 97/97. Live: headless race-loop (many runs) must be
**0% blank** post-deploy (the pre-fix loop was ~80% blank).

## Result

The route is reactive end-to-end — no captured consts, no keyed-remount, no hydration
recreate. Direct/shared-link loads hydrate the server HTML in place; the blank-`<template>`
race is structurally eliminated.
