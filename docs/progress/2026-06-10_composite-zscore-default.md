# Composite card defaults to the z-score breakdown

**Date:** 2026-06-10

## Goal

The rating IS z-scores, so the default Composite card should *show* the z-score
breakdown — surfacing the actual rating composition (including the new team-defense
datapoints from migrations 060/061), not a curated counting-stat template. One card
for players, offense + defense for teams. NFL offensive players are the only outlier.

## What was done

- **`CompositeCard.tsx`** — `template()` now returns the counting-stat template (the
  pizza source) only for **NFL offensive players** in the default (Regular) model;
  every other entity (NBA + Football players, all teams, NFL defenders) falls through
  to the z-score `rating_breakdown` pizza. `t` is non-null only where a template exists,
  and for NFL that's offensive positions only, so the check targets them exactly. The
  Fantasy model still swaps any fantasy-supported entity to its counting-stat template +
  fantasy headline. Header comment updated to the z-score-default model.

Frontend-only — the rating breakdown already carries the updated datapoints; this just
renders them. (An earlier all-stats grid + view-dropdown exploration was reverted as
over-built.)

## Files changed

- `src/components/solid/CompositeCard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright (dev server → live prod API): football team shows Offense + Defense z-pizzas
  with the new datapoints (Goals Against, Big Chances Allowed, Fouls Committed/Won,
  Penalties Won/Conceded, PAdj Tackling); football player shows one z-pizza; NFL QB keeps
  its counting-stat template (Pass Attempts / Yards / TDs). Bonus: the team fouls/PKs are
  now visible as wedges (they're rating datapoints), covering that earlier request.

## Result

The Composite card is now a transparent window into the z-score rating for NBA / Football
/ teams, with NFL offense the lone counting-stat exception.
