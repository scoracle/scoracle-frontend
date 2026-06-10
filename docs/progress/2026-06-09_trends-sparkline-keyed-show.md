# Trends sparkline stuck on current season — keyed `<Show>` fix

**Date:** 2026-06-09
**Scope:** `src/components/solid/TrendsCard.tsx` (one render-path fix, no data/API changes)

## Goal

The Trends card's sparklines were frozen on whatever season first rendered. Selecting a
past season updated the headline scores but the polyline, dots, and date axis kept the
first season's series. Scott: "I want it dynamic to the season selected."

## Diagnosis

Every layer of the season plumbing checked out before the actual cause surfaced:

- `TrendsCard` passes `ctx.season()` reactively to `getSparkline`/`getTrends` ✓
- `sparklineUrl`/`trendsUrl` append `?season=` ✓
- `query()` cache keys include season ✓
- Go handler binds `?season=` → `$4`; the `sparkline` statement's `event_series`
  filters on `season_pick` ✓ (`go/internal/db/db.go`)
- `dataCacheKey` includes the raw query string ✓
- Live API returns distinct, season-filtered events (player 115: 2025 → 45 events
  Oct 21–Apr 17; 2024 → 79 events Oct 23–May 6) ✓

Playwright repro (dev server, real season switch) showed the smoking gun: on selecting
2024 the URL updated, both server-fns re-fetched, the headline flipped 95→97 (matching
the API), but the axis stayed "Oct 21–Apr 17".

**Root cause:** the spark blocks rendered via a **non-keyed `<Show>` with a function
child** that eagerly evaluated the accessor:

```jsx
<Show when={generalSpark()}>
  {(g) => sparkBlock(label, color, g())}
</Show>
```

A non-keyed `<Show>` only re-runs its child on falsy→truthy flips. `g()` was read once
into a plain object whose properties feed the SVG non-reactively — so when the season
(or entity — same remount-free path) changed and `generalSpark()` recomputed, `when`
stayed truthy and the DOM kept the first-rendered series. The headline updated because
`{generalScore()}` is an ordinary reactive JSX expression.

## Fix

`keyed` on both spark `<Show>`s — the memos return a fresh object per recompute, so
keyed mode re-creates the block whenever the series changes:

```jsx
<Show when={generalSpark()} keyed>
  {(g) => sparkBlock(compositeLabel(), tierColor(generalScore() ?? 50), g)}
</Show>
```

Same for the vibe spark. Comment added at the call site explaining why keyed is required.

## Bug-class sweep

Grepped all non-keyed `<Show>` function children for the same eager-eval freeze:

- `TransfersCard` — reads `d()` only inside tracked positions (`when`, `For each`) — safe
- `SpecialistCard`, `CrystalBall` — already `keyed` — safe
- `VibeCard`/`CompositeCard`/TrendsCard outer — accessor ignored (`(_x) =>`), inner
  content reads reactive memos — safe
- `Shell`/`leaderboard` — `c()` read inside JSX attributes — reactive — safe

TrendsCard was the only instance.

## Verification

- Playwright repro after fix: axis flips Oct 21–Apr 17 → Oct 23–May 6 on selecting
  2024; headline 95→97; both lines redraw.
- `npm run typecheck` clean; `npm test` 119/119.

## Notes

- The vibes line legitimately only spans from vibes launch — accepted limitation, not
  part of this bug.
- The same keyed fix also covers remount-free cross-entity navigation (the sparklines
  previously would have frozen on the first entity's series there too).
