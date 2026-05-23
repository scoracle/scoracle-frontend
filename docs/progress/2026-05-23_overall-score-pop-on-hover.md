# 2026-05-23 — Overall score pops on hover

## Goal

Give the per-category "Overall score: NN" readouts the same reactive
flair the pizza slices already have — hover the line, the number
scales up. Pulls the user's eye to the headline number of each card
the same way slice hover pulls it to the wedge they're inspecting.

## What Was Done

- Added two new classes to the score paragraphs:
  - `.overall-score-line` on the wrapping `<p>` — the hover trigger.
  - `.overall-score-value` on the inner colored `<span>` — the
    target that scales.
- Wired them into all four score-line sites:
  - `StatsCard.tsx` — the line under each category's pizza chart.
  - `CompareCard.tsx` — the line under the single-PizzaChart fallback
    (no compare entity picked), plus both halves of the butterfly
    `.compare-score-row` (primary + compare).
- CSS in `StatsCard.css` (already imported by both StatsCard and
  CompareCard):
  - `.overall-score-value` is `display: inline-block` with
    `transform-origin: center` and a `0.15s ease-out` transition on
    `transform` + `font-weight` — same timing the pizza slice labels
    use.
  - `.overall-score-line:hover .overall-score-value` applies
    `transform: scale(1.4)` and bumps `font-weight` from medium to
    bold for a little extra punch.

The transform-based approach avoids layout shift — the surrounding
text doesn't reflow when the number pops, just the number itself
visually scales over its own footprint.

## Files Changed

- `src/components/solid/StatsCard.tsx`
- `src/components/solid/CompareCard.tsx`
- `src/components/solid/StatsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 131/131

UI not opened in the browser this commit.

## Result

Hovering any "Overall score: NN" line on StatsCard or CompareCard
scales the numeric value up ~1.4× with a quick fade. Same reactive
language as the pizza slices — the card now reads as a single
hover-responsive surface instead of "chart hovers, text doesn't."
