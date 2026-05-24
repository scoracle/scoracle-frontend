# 2026-05-24 — All-time great badge (EntityMeta)

## Goal

The backend shipped a fourth composite-rank number: an **all-time
historical percentile** alongside the existing in-season rank. Same
0-100 scale, same tier-color convention, but era-fair across every
season on record — it answers "is this one of the best seasons we've
ever recorded?". Surface it on the profile without crowding the
deliberately-minimal meta surface.

## What Was Done

### Decision

Of the candidate treatments (rare badge / always-on secondary line /
types-only), went with the **rare "all-time great" badge**: it renders
on EntityMeta *only* when the all-time rank clears a high threshold
(`ALLTIME_GREAT_THRESHOLD = 95`), so it stays absent on ordinary
profiles and means something when it appears. The headline Rating chip
is unchanged — it still shows `season_composite_score`; the badge is a
separate, rarer signal.

### Type plumbing

`src/lib/data/stats.server.ts` — `StatsResponseMeta` gained two fields
to match the shipped profile-meta payload:

- `season_composite_rank?: number | null` — the in-season rank
  (uniform 0-100 within this season's peer cohort). Typed for
  completeness; **not consumed yet** (the headline chip uses the
  composite score). Documented as future leaderboard/headline material.
- `season_composite_rank_alltime?: number | null` — the new all-time
  historical percentile. **Consumed by the badge.**

`src/lib/data/trends.server.ts` — `TrendsResponse` gained
`entity_alltime_score_rank: number | null`, the trends-payload mirror
of the same number. Typed for parity / future in-Card use; nothing in
TrendsCard reads it today (the live badge reads the profile-meta copy
via EntityMeta).

### Badge

`src/components/solid/EntityMeta.tsx`:

- Added `ALLTIME_GREAT_THRESHOLD = 95` module constant with a comment
  explaining why 95 (top ~5% of all seasons ever scored → rare by
  construction).
- Added `allTimeGreat` memo reading
  `stats()?.meta?.season_composite_rank_alltime` — true only when
  non-null and `>= ALLTIME_GREAT_THRESHOLD`. Reads the same profile-meta
  envelope as the Rating chip, so it resolves on the same async tick.
- Inserted the badge JSX between the Vibe readout and the details
  `<For>`, wrapped in the same `ErrorBoundary` + `Suspense` pattern the
  Rating/Vibe rows use (a stats outage hides only the badge).

`src/components/solid/EntityMeta.css`:

- `.pw-alltime-great` spans `flex: 0 0 100%` inside the flex-wrap
  `.pw-details` grid, so it breaks onto its own centered line (Rating +
  Vibe above it, position/other details below).
- `.pw-alltime-great-badge` is a pill: 1px elite-tier border + elite
  text, uppercase letterspaced body type, leading `★`. Uses
  `var(--percentile-elite)` directly — `>= 95` is always elite tier, so
  the color is constant and matches `tierColor()`'s mapping without an
  inline style.

## Files Changed

- `src/lib/data/stats.server.ts` (two meta fields typed)
- `src/lib/data/trends.server.ts` (one trends field typed)
- `src/components/solid/EntityMeta.tsx` (threshold + memo + badge JSX)
- `src/components/solid/EntityMeta.css` (badge styles)

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- Badge gating verified by reading: renders only when
  `season_composite_rank_alltime != null && >= 95`; null/below → absent.
- UI not opened in the browser this commit. Test entities from the
  backend brief to eyeball next session: `football/player/997` (Kane,
  ~99.8 → badge shows), `football/team/19` (Arsenal, ~79.7 → no badge).

## Result

Profiles for genuinely all-time-great seasons now carry a small elite-
tier "★ All-time great" pill under the Rating/Vibe chips; every other
profile is visually unchanged. The two new rank fields are typed on
both payloads, so a future all-time-greats leaderboard surface (the
real product this field unlocks) can consume them without more data-
layer work.
