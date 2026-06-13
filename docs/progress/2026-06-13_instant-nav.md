# 2026-06-13 — Instant-nav (snappy shell, render-as-received)

## Goal
Scott's UX pillar: a profile should appear immediately on navigation, with cards
rendering as their data arrives — not the page freezing on the prior entity
until the headline card resolves. ("Snappy is a big part of our feel.")

## Diagnosis
Profile→profile nav held the OLD page until the active card's data resolved
(~130ms warm, up to ~800ms cold — measured 874ms). Root cause: `@solidjs/router`
wraps every navigation in `startTransition` (hardcoded in routing.js), and a
transition won't commit the new render while ANY read resource suspends — so the
whole page (even the local-store meta) waited on the slowest card. Verified by
delaying the sparkline 5s: the old "Erling Haaland" page stayed put the full 5s.
Keying subtrees inside the route did NOT help — the transition holds the commit
at the route level regardless.

## What Was Done (`src/routes/profile.tsx`)
The fix makes the first render after a client navigation NON-suspending, so the
transition commits immediately:
- Extracted `ProfileBody` (meta widget + content cards) and remount it per
  entity via a single-item `<For>` keyed on `sport|type|id`. (`<Show keyed>`
  miscompiles under this SolidStart-alpha SSR path — "template is not a
  function" — so `<For>` is the keyed primitive.)
- On a client-side remount, `ProfileBody` defers its real content by one tick:
  renders a static `ProfileBodySkeleton` first (no suspended resources → the
  router transition commits instantly), then `onMount` flips it to the real
  content, which streams in via a `<Suspense>` (same skeleton fallback) now
  OUTSIDE the transition.
- A `<Suspense>` wraps the real body: ContentShell reads `getSparkline` at its
  top level (scope/season controls), which suspends on remount; without this
  boundary it bubbled to the app-level fallback and the main went BLANK during
  load. Now it shows the skeleton.
- Gated by a module flag `bodyBooted`: the defer only fires on post-hydration
  client navs. SSR and the initial hydration mount render real content — so SSR
  HTML is complete and hydration sees a matching tree (this avoids the race that
  blanked the OLD keyed approach under streaming SSR; `mode:"async"` makes it
  moot regardless).

## Verification (local dev, Playwright)
- Nav: old entity released by ~40ms (skeleton shell), content filled ~40–120ms
  warm. Mid-load shows a clean skeleton (tarot borders, avatar + line
  placeholders, card skeleton) — not blank, not the held old page.
- Hydration stress: 6 direct loads (players + team) all render full content,
  **0 page errors**, no blanks.
- Team entity + team→player nav: clean, 55ms, 0 errors.
- Sticky tab-switching still instant; News still loads; interactivity during a
  loading card preserved (6–21ms tab switches). `typecheck` clean; `npm test`
  119/119.

## Result
Client navigation paints the new shell immediately and streams cards in as
received, on every entity type — without reintroducing the blank-profile
hydration race. Snappy by design.
