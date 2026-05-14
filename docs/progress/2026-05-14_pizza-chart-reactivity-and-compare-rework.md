# 2026-05-14 — Pizza-chart reactivity + Compare rework

## Goal

The stats pizza charts felt static, and the Compare card's color-overlay
approach was visually noisy. Two product asks:

1. **Reactivity.** Hovered slice should grow and its labels enlarge so the
   chart feels alive under the cursor.
2. **Compare rework.** Replace the same-chart color overlay with a
   side-by-side two-chart layout — primary entity pill upper-left of the
   chart grid, comparison search/pill upper-right, both charts use the
   standard percentile-tier colors.

While doing it, grow the Stats chart to use the full card width and crank
the hover boost when the chart renders small (compare-pair mode) so the
feedback stays visible at the reduced render size.

## What Was Done

**PizzaChart hover state (`PizzaChart.tsx` + new `PizzaChart.css`).**
Each slice tracks its own hover state via a local `hoveredIdx` signal.
On hover the slice's outer radius grows by `HOVER_RADIUS_BOOST` (22 user
units; 40 in `intense` mode), the label is nudged outward by
`HOVER_LABEL_BOOST`, and the label / sublabel / percentile fonts scale up
via CSS (with a 150 ms opacity-friendly transition). A full-wedge
invisible hit-area path makes even tiny low-percentile slices easy to
target. CSS co-located with the component so the pair is a one-step
`git mv` away from `@scoracle/ui` when sandbox kicks off.

**Comparison-overlay dropped.** Removed the `ComparisonChart` variant
and the `ComparisonEntityData` export from `PizzaChart` entirely. The
new compare flow renders two standard `<PizzaChart>` instances side by
side in `CompareTab`'s `ChartSlot`.

**CompareTab rework (`CompareTab.tsx` + `CompareTab.css`).** Each chart
slot now flexes: single chart centered when no comparison, horizontal
pair (`.stats-pizza-chart-pair`, two `.compare-chart-cell` halves) when
a comparison is selected. A new `.compare-header` row sits below the
rate/scope toggles and just above the chart grid — primary entity pill
on the left, `<CompareSearch>` (input or selected-pill) on the right —
so the tabs stay packed at the top of the card and the entity badges
sit physically close to the charts they describe.

**Charts grow to fill the card.** Stats and Compare both now pass
`{ width: 640, height: 640, outerRadius: 207, labelOffset: 41 }` (up
~28% from the previous 500/162/32, keeping the same proportions). The
`.stats-pizza-chart` wrapper's `max-width` is bumped to 640 to match.
In compare-pair mode the existing `.stats-pizza-chart-pair` rule
overrides max-width to 100% so each cell scales down naturally.

**Intense hover (`intenseHover` prop).** Because pair mode shrinks each
SVG to ~half the card width, the default hover boost reads small. The
new opt-in prop bumps slice growth 22→40 user units, label outward push
10→20, label font 15→22 px, sublabel 13→18, percentile 16→24. Wired in
`CompareTab` so it activates exactly when `hasCompare` is true.

## Files Changed

- `src/components/solid/PizzaChart.tsx` — hover state, `intenseHover`
  prop, full-wedge hit area, comparison overlay removed.
- `src/components/solid/PizzaChart.css` *(new)* — slice/label fonts,
  hover transitions, intense-hover overrides, no-data fallback.
- `src/components/solid/CompareTab.tsx` — side-by-side pair layout,
  header row positioned below toggles, `intenseHover` wired.
- `src/components/solid/CompareTab.css` — header layout, side-by-side
  flex pair, responsive tweaks.
- `src/components/solid/StatsTab.tsx` — chart options bumped to
  640/207/41.
- `src/components/solid/StatsTab.css` — `.stats-pizza-chart` max-width
  500→640; pizza-slice hover rules moved out to `PizzaChart.css`.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 92/92 pass (no test changes).
- `npm run dev` — Vite boots clean; profile route SSRs 200 across NBA
  player, NBA team, and Football team URLs.
- Live click-through (Stats + Compare on a player and a team, both
  modes of Compare): hover bump reads as intended, two-chart layout
  fits the 750 px card content area, hover label boost still has
  clearance.

## Result

The pizza chart is now the centerpiece it deserves to be — bigger, lively
under the cursor, and re-used as the single visual language across both
Stats and Compare. The Compare card finally feels coherent: two clean
charts of the same shape and color scale next to each other, with the
entity badges sitting where they belong. PizzaChart is also one
`git mv` away from `@scoracle/ui` whenever sandbox kicks off.
