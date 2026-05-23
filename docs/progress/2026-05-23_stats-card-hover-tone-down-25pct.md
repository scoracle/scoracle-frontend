# 2026-05-23 — Tone down stats-card hover-grow by 25%

## Goal

After bumping the Overall-score pop to match the pizza intense-hover
scale (2.2×) earlier this session, the in-card hover language as a
whole reads as too aggressive — slices boost their radius too far,
labels grow too much, and the Overall-score line jumps a lot. Reduce
the *growth amount* of every stats-card hover effect by 25% so the
language stays consistent but feels calmer.

Interpretation: "tone down by 25%" applied to the growth from the
resting state, not the final size. A label growing 10px → 15px (5px
growth) becomes 10px → 14px (4px growth = 5 × 0.75). A scale of 2.2×
(growth of 1.2 over baseline 1.0) becomes 1.9× (growth 0.9).

## What Was Done

`src/components/solid/PizzaChart.tsx` — boost constants reduced 25%:

| Constant | Was | Now |
|---|---|---|
| `HOVER_RADIUS_BOOST` | 22 | 17 |
| `HOVER_RADIUS_BOOST_INTENSE` | 40 | 30 |
| `HOVER_LABEL_BOOST` | 10 | 8 |
| `HOVER_LABEL_BOOST_INTENSE` | 20 | 15 |

`src/components/solid/PizzaChart.css` — hover font-sizes reduced so
growth-from-base shrinks 25%:

| Element | Resting | Was | Now |
|---|---|---|---|
| `.pizza-slice-label` | 10px | 15px | 14px |
| `.pizza-slice-sublabel` | 9px | 13px | 12px |
| `.pizza-slice-percentile` | 10px | 16px | 15px |
| `.pizza-slice.is-intense .pizza-slice-label` | 10px | 22px | 19px |

`src/components/solid/StatsCard.css` — Overall-score pop scale
reduced 25% of growth:

| Selector | Was | Now |
|---|---|---|
| `.overall-score-line:hover .overall-score-content` | `scale(2.2)` | `scale(1.9)` |

ButterflyChart hover-grow values left alone — the user specifically
said "stats card elements," and ButterflyChart only appears on
CompareCard's compare mode. Easy follow-up if it also feels too
aggressive once these land.

## Files Changed

- `src/components/solid/PizzaChart.tsx`
- `src/components/solid/PizzaChart.css`
- `src/components/solid/StatsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 131/131

UI not opened in the browser this commit.

## Result

Pizza slices boost less on hover, labels grow less, percentile
numerals grow less, and the Overall-score line pops a touch less — all
by 25% of the previous growth amounts. The hover language still reads
as a unified system; it just doesn't shout as loud.
