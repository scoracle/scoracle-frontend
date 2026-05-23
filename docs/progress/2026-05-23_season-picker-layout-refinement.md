# 2026-05-23 — Season picker layout refinement

## Goal

Three layout/UX refinements to yesterday's season picker landing:

1. **Dropdown option background** — match the CompareSearch autofill
   panel (`var(--bg-card)`) so the two open dropdowns on the Compare
   card don't visually disagree.
2. **Compare card: one dropdown per entity** — the primary entity and
   the compared entity each get their own SeasonSelect, paired
   side-by-side in the middle slot with a hairline separator. Lets a
   user view "Cowboys 2025 vs Cowboys 2022" instead of being locked to
   adjacent years on self-compare.
3. **Stats card: move into the toolbar** — the season dropdown lives
   on the existing rate/scope toolbar row instead of a new row below.
   Absolute-positioned on the left so the existing centered NavStrips
   don't shift on profiles with only one available season.

## What Was Done

**`SeasonSelect.css`**
- `option { background: var(--surface) }` → `var(--bg-card)`. Same
  token as the autofill suggestions panel.

**`CompareCard.tsx` + `CompareCard.css`**
- Two SeasonSelects in `.compare-header-season`, wrapped in a new
  `.compare-season-pair` flex container with a 1px `.compare-season-sep`
  vertical hairline between them.
- Each dropdown is independently gated by its entity's
  `meta.available_seasons.length > 1`. When one side has only one
  season, a `.compare-season-placeholder` (transparent, fixed width)
  holds the slot so the pair stays symmetric and the primary side
  doesn't shift left.
- `compareDefaultSeason(other)` replaces `compareSeasonFor(other)` —
  same logic (self-compare → next-older, oldest-pick fallback), but
  now used only as the default until the user explicitly picks via the
  secondary dropdown.
- New signal `compareSeasonExplicit` holds the user's explicit pick
  for the secondary; `compareSeasonResolved()` falls through to the
  default when the explicit pick is null.
- URL param `?vsSeason=N` now persists the secondary's pick alongside
  the existing `?vs=<id>`. Picking a new compared entity resets both
  the explicit override and the URL param so the smart default fires
  again on the fresh target.
- `compareAvailableSeasons()` memo reads from `compare()?.meta` so the
  secondary dropdown only offers seasons valid for the compared
  entity (e.g., comparing a rookie to a veteran returns short vs long
  lists).

**`StatsCard.tsx` + `StatsCard.css`**
- `.stats-header` row removed. SeasonSelect moves inside
  `.stats-toolbar` as a `.stats-toolbar-season` div, absolute-
  positioned at `left: 0` against the already-relative toolbar so the
  rate/scope NavStrips stay centered without flex-distribution math.
- Toolbar's `<Show>` predicate now also fires when only the season
  picker is present (multi-season player without rate/scope toggles
  still gets a visible toolbar).
- Narrow-viewport breakpoint (≤600px) drops the absolute positioning
  so a wrapped toolbar doesn't overlap itself.

## Files Changed

- `src/components/solid/SeasonSelect.css`
- `src/components/solid/CompareCard.tsx`
- `src/components/solid/CompareCard.css`
- `src/components/solid/StatsCard.tsx`
- `src/components/solid/StatsCard.css`

## Verification

- `npm run typecheck` — clean.
- `npm test` — 137/137.

Visual changes — not driven end-to-end in the browser this commit;
layout-only refinements on top of yesterday's working data path.

## Result

Stats card's season picker now sits left-of-center on the same row as
the rate/scope toggles — single toolbar strip. Compare card shows two
paired dropdowns (with hairline) between the entity pills, each
controlling its own side's fetch independently. Open dropdown panels
on either card now share a background colour with the CompareSearch
autofill suggestions.
