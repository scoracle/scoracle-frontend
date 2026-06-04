# 2026-06-04 — Async SSR: the real fix for the blank profile (streaming-hydration race)

## Goal

Direct/shared-link `/profile` loads intermittently rendered blank (header + footer, empty
`<main>`, search stuck on the default sport). The earlier reactive-params refactor
(`2026-06-04_reactive-profile-params-...`) was sound but did **not** fix it. Find + fix the
real cause.

## Diagnosis (reproduced locally + instrumented)

- Stood up the built worker locally (`npm run cf:dev`) — **reproduced the blank reliably
  (~80%)**, so iteration no longer needed prod deploys.
- Temporary `console.log` at the top of the route component: in a blank run the
  `[PROF render]` log **never fired** — the `Profile` component never executes on the
  client. So it's not params/createAsync *inside* the route; the **lazy route never
  hydrates**.
- The SSR HTML carried **4 `<template>`s** — Solid's streaming-Suspense placeholders. With
  `mode: "stream"` (SolidStart default), suspended boundaries are emitted as `<template>`s
  that the client must *adopt* during hydration. That adoption **races**: win → the route
  hydrates; lose → the root boundary is left unadopted and `Profile()` is never instantiated
  → blank. (The route chunk is modulepreloaded, so it wasn't a late-chunk race.)

## What Was Done

- **`entry-server.tsx`: `createHandler(fn, { mode: "async" })`.** Async SSR renders the
  stream to completion server-side and ships a **complete HTML document — zero `<template>`
  placeholders** — so hydration is deterministic (nothing to adopt). Local race-loop after:
  **0/20 blank** for both team and player (was ~16/20).
- Kept the reactive-params refactor (still the right structure) and added a fallback to the
  root `<Suspense>` in `app.tsx` (defense for client-nav suspense).

## Trade-off

Async SSR waits for the page's awaited data before the first byte (slightly higher TTFB)
instead of streaming a shell first. For a data-driven profile page this is the right call —
a few hundred ms of TTFB beats an ~80%-flaky blank page. Per-pane `<Suspense>` skeletons
still cover lazily-activated tabs on the client.

## Files Changed

`entry-server.tsx` (async mode), `routes/profile.tsx` (diagnostics removed).

## Verification

Local cf:dev race-loop: 0/20 blank (team + player); SSR `<template>` count 0; `Profile()`
runs every load. `npm run typecheck` clean; `npm test` 97/97. Prod race-loop (30 runs) must
be 0% blank post-deploy.

## Result

The streaming-Suspense hydration race is eliminated at the source — the page ships complete
HTML and hydrates deterministically. Direct/shared-link loads render reliably.
