# 2026-05-23 — Stats: EmptyCard fallback + dedicated season-picker row + uniform meta gap

## Goal

Two field-test cleanups on the profile page:

1. When a player has no chartable stats for the selected season,
   the placeholder read as a generic `<p>No statistics available</p>`
   text line — out of family with the rest of the deck. Want the
   shared `<EmptyCard>` (the Veil tarot) instead.
2. The season picker had been absolutely-positioned on the left edge
   of the rate/scope toolbar. At the profile's natural width it
   looked stranded and was also hidden in the empty-stats branch
   (trapping the user on the empty season with no way to switch).
   Plus the meta → tabs → toolbar → chart vertical rhythm wasn't
   uniform; meta sat noticeably further from the rest.

## What Was Done

`src/components/solid/StatsCard.tsx`:

- Empty-stats branch now renders `<EmptyCard note="(no stats for
  this season)" />` — same Veil archetype every other empty surface
  uses (Vibes, Articles, X, Trends).
- Season picker promoted to its own `.stats-season-row` below the
  rate/scope toolbar — and crucially **outside the `hasCharts()`
  gate**, so the user can switch away from an empty-stats season
  without being trapped on it.
- Toolbar visibility now depends only on rate + scope availability
  (new `showToolbar` memo). Season no longer forces the toolbar to
  render.
- Skeleton updated to mirror the new structure (toolbar bar +
  season row, then chart skeletons).

`src/components/solid/StatsCard.css`:

- `.stats-toolbar-season` (absolute-positioned left-edge season
  pinning) retired.
- New `.stats-season-row` — flex, centered, mild 0.25rem vertical
  padding so it sits as its own breathing row.
- `.stats-toolbar` drops `position: relative` (no absolute children
  anymore).
- `.stats-empty` rule retired (no remaining callers); `.stats-error`
  kept for the data-fetch-failure branch.

`src/components/solid/CompareCard.tsx`:

- Same EmptyCard swap on the parallel empty-stats branch — keeps
  the two tabs visually aligned.

`src/routes/profile.css`:

- `.profile-main` gap dropped from `1.5rem` → `1rem`. Matches the
  gap every other neighboring surface already uses
  (`.content-shell`, `.content-shell-panes`, `.stats-card`) so the
  meta → nav → toolbar → season → chart cadence reads as one
  uniform rhythm.

## Files Changed

- `src/components/solid/StatsCard.tsx`
- `src/components/solid/StatsCard.css`
- `src/components/solid/CompareCard.tsx`
- `src/routes/profile.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- UI not opened this commit. Worth a spot-check on a player with
  multiple seasons where one season has no chartable stats — the
  season picker should now stay reachable while the EmptyCard
  renders.

## Result

The "no stats" surface stops feeling like an error message and
starts feeling like a card in the deck. The season picker has a
sensible home that survives empty states. The meta card no longer
sits in an oddly larger gap than the content rows below.
