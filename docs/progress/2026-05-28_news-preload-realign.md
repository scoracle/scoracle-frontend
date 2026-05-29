# 2026-05-28 — Realign tab preloads behind a single PROFILE_TABS registry

## Goal

The profile page is meant to fire every tab's API request as soon as the user
picks an entity, then let each island hydrate as its payload lands — no load
screen unless you click straight into a still-in-flight tab. In practice the
News tab always showed a loading state on click, and X posts made it worse.

Root cause: `firePreloads` warmed `getNews` + `getTwitterFeed`, but NewsCard
reads the **merged** `getNewsFeed` (a different `query()` cache key, and one
that calls those two server-side anyway). So the News preload was dead and the
feed cold-fetched on click. Trends had the same gap (`getTrends` never warmed).
The deeper problem: the tab→preload mapping was a hand-kept list that had
silently drifted from what the Cards consume.

## What Was Done

- **New single source of truth** — `components/solid/profile-tabs.tsx`:
  `PROFILE_TABS`, one descriptor per tab co-locating `{ id, label, body (Card),
  fallback (skeleton), preload }`. The preload calls the **same** query the Card
  reads via `createAsync` (same fn + same args = same cache key), so the pairing
  can't drift — you can't add a Card pane without its matching preload.
- **ContentShell** now derives its NavStrip items + panes from `PROFILE_TABS`
  (and the exported `PROFILE_NAV_ITEMS`), replacing the two parallel `PANES` /
  `NAV_ITEMS` lists. Behavior unchanged: sticky-mount, active-class CSS flip,
  per-pane `<Suspense>` fallback.
- **profile.tsx** `firePreloads` loops `PROFILE_TABS` calling each `preload`,
  plus the one cross-cutting non-tab read (`getSportMeta`). The per-query
  imports are gone. News now warms `getNewsFeed`; Trends warms `getTrends`.
- **Guard test** — `routes/profile-preload.test.ts`: asserts `PROFILE_TABS` is
  exhaustive over the `ProfileTab` union (the one thing TS can't enforce on an
  array). Replaced an earlier string-matching test that checked the old preload
  list — unnecessary once the list is derived from the registry.
- **Docs** — `CLAUDE.md`: documented `PROFILE_TABS` as the tab source of truth,
  the "adding a tab = one entry" rule, and the merge-query trap (warm
  `getNewsFeed`, not its server-side `getNews`/`getTwitterFeed` inputs).

X latency itself is left as-is by decision: the realigned preload makes the
feed warm by click time for the normal path; only a straight-to-News cold load
still waits on X.

## Files Changed

`components/solid/profile-tabs.tsx` (new), `components/solid/ContentShell.tsx`,
`routes/profile.tsx`, `routes/profile-preload.test.ts` (new), `CLAUDE.md`.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 138/138 pass.
- `npm run build` — succeeds (exercises the Solid/SSR compile of the new
  registry-driven pane render).

## Result

All six tabs' requests fire once on entity selection and hydrate as payloads
arrive; News no longer cold-fetches on click. Three parallel tab-keyed lists
collapsed into one `PROFILE_TABS` registry, eliminating the preload-drift class
that caused the bug rather than guarding it with a string test.
