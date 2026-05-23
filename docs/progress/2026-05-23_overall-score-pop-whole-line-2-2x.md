# 2026-05-23 — Overall score pop: whole line, 2.2× to match pizza intense hover

## Goal

Two refinements to the Overall-score hover-pop from earlier this
session:

1. The pop currently scales **just the colored number** — the
   surrounding `Overall score: ` text stays put. Make the *whole*
   line ("OVERALL SCORE: 73") scale together so it reads as one
   unified pop, not "the number got bigger."
2. The current 1.4× scale feels timid compared to the pizza chart's
   intense-hover text scale (10px → 22px ≈ 2.2×). Match the chart's
   scale exactly so the in-card hover language is consistent.

## What Was Done

- Wrapped each score line's content (label + colored value) in a
  single `<span class="overall-score-content">`. Four sites:
  StatsCard's per-category line, CompareCard's no-compare fallback,
  and both halves of CompareCard's butterfly `.compare-score-row`.
- Dropped the now-unused `.overall-score-value` class from the inner
  number span — the colored value still gets its tier color via inline
  style, no separate hook needed.
- CSS: the `transform` + transition moved from `.overall-score-value`
  to `.overall-score-content`, scale bumped from `1.4` → `2.2`. The
  `<p>` (`.overall-score-line`) is still the hover trigger so the
  whole line is a hit area, but only the inner span scales — keeps
  the layout box DOM size stable while the rendered text grows over
  its own footprint.

## Files Changed

- `src/components/solid/StatsCard.tsx`
- `src/components/solid/CompareCard.tsx` (three sites: fallback +
  butterfly primary + butterfly secondary)
- `src/components/solid/StatsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 131/131

UI not opened in the browser this commit.

## Result

Hovering any "Overall score: NN" line scales the entire text 2.2×
with the same 0.15s ease-out the pizza slices use. Hover language is
now consistent within a card — chart text and Overall-score text
both jump the same amount.
