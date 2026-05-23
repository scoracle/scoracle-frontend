# 2026-05-23 — Compare butterfly: per-entity Overall scores

## Goal

Add the per-category Overall score readout (already on StatsCard since
the position-aware feat commit earlier today) to the butterfly Compare
card. Each entity's score lands on its own side of the butterfly — the
primary's score under the LEFT half, the compare's score under the RIGHT
half — so the spatial mapping established by the chart extends to the
readout.

This was originally attempted before the session's merge; the in-progress
work got stashed when we discovered origin's butterfly split, and is now
re-implemented on top of the merged structure.

## What Was Done

- Imported the canonical `tierColor` util into CompareCard.
- Added an `overallScore(stats)` helper — mean of percentiles, rounded.
  Lives at module scope in CompareCard for now; if a third caller appears
  (likely TraitsCard or a sport-specific surface) it's a one-line lift to
  a shared util.
- Slot render now computes `primaryScore` / `compareScore` per slot and
  renders below the chart:
  - **No compare picked** (single PizzaChart fallback): one centered
    "Overall score: NN" — matches StatsCard pixel-for-pixel.
  - **Butterfly mode**: a two-column `.compare-score-row` with the
    primary readout on the left and the compare readout on the right,
    each centered within its half so it aligns with the butterfly's
    left/right halves above. When the compare entity has no data for
    a given category, the second column suppresses (no orphan readout).

## Files Changed

- `src/components/solid/CompareCard.tsx` — import tierColor, add
  overallScore helper, render score readouts per slot
- `src/components/solid/CompareCard.css` — new `.compare-score-row`
  rule (flex row + equal-width columns + centered child labels)

## Verification

- `npm run typecheck` — clean
- `npm test` — 119/119 passing
- Padding sanity-checked while in flight: `global.css:208` is still
  `padding: 1.5rem` uniform (the morning's Shell padding fix survived
  the merge); Shell.tsx docstring matches.

UI not verified in the browser this commit — `npm run dev` not run.
User can refresh the existing dev session to confirm.

## Result

The butterfly's "Overall score" line is back where it belongs — on the
correct side for each entity, colored by `tierColor()` against the
shared 5-step antique-tarot palette. Single-entity mode (no compare
picked yet) retains the centered single readout, so the card silhouette
doesn't shift when a compare entity is added/removed.
