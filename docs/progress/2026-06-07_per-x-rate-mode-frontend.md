# 2026-06-07 — Per-X rate mode: frontend wiring (#23 core complete)

## Goal
Surface the backend `rating_modes` (migration 042) in the app: a **Per-X dropdown**
in the ScopeStrip that re-rates the Composite/Specialist cards between season
totals and a rate-normalized view (NBA Per 36 / FB Per 90 / NFL Per Game) —
players only. Composes with the existing Scope (position for players;
conference/division/league for teams) and Season dropdowns.

## What Was Done
- **Types + selector** (`lib/data/sparkline.server.ts`): added `rating_modes`
  (`Record<string, RatingModeBlock>`) to `SparklineRating`, plus `ratingForMode
  (r, mode)` → a `RatingView` that returns the alternate-mode block (or the
  season-total columns for `"default"` / a missing block). Pure client switch —
  no refetch.
- **State** (`contexts/profile.ts`, `routes/profile.tsx`): `RateMode` type +
  `rateMode`/`setRateMode`, URL-synced via `?rate=` (mirrors `scope`/`season`;
  `"default"` omitted from the URL).
- **Registry** (`card-registry.tsx`): each card declares its `controls`
  (`composite` → rate/scope/season; `specialist` → rate/season; `trends`,
  `roster` → season; vibes/news/transfers → none).
- **ScopeStrip wiring** (`ContentShell.tsx`): renders rate/scope/season `<Select>`
  from the active card's `controls`, each **self-hiding** when its data is absent
  (rate → player with `rating_modes`; scope → >1 cohort; season → >1 season).
  Per-sport rate options; `"default"` label is "Per Game" (NBA) / "Total"
  (NFL, football).
- **Cards** (`CompositeCard.tsx`, `SpecialistCard.tsx`): read the active block via
  `ratingForMode(rating, rateMode)` — breakdown/pizza, `scopedComposite`
  (composite_rank × scope), and the Specialist peak all follow the selected mode.
  So **per-position composes with Per-X** (each mode block carries its own
  `scoped_ranks`). Position is read from the (mode-invariant) rating directly.
- The meta-card headline stays the default rating (the rate control scopes the
  card bodies).

## Files Changed
`lib/data/sparkline.server.ts`, `contexts/profile.ts`, `routes/profile.tsx`,
`components/solid/card-registry.tsx`, `components/solid/ContentShell.tsx`,
`components/solid/CompositeCard.tsx`, `components/solid/SpecialistCard.tsx`.
New: `lib/data/sparkline.test.ts`.

## Verification
- `npm run typecheck` clean; `npm test` → 16 files / 111 tests (new `ratingForMode`
  test: default vs alternate vs absent-block fallback).
- Live (dev against prod API): Jokić Composite headline **99.6** default vs
  **99.2** with `?rate=per_36`; the strip shows `Per Game | All | 2025`, the
  Per-X dropdown opens to `Per Game / Per 36`. No page errors. (SSR-verified +
  browser screenshot.)

## Result
#23 core is complete end-to-end: backend `rating_modes` live, API serves it, and
the Per-X dropdown re-rates the cards in-app — composing with per-position /
team-cohort scope and season. Phases 2 (Search) + 3 (Compare) remain as the later
ScopeStrip additions.
