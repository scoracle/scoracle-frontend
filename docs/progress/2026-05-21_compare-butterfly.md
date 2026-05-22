# 2026-05-21 — CompareCard: butterfly (mirror-halves) redesign

## Goal

The stacked-pair-of-pizza-charts CompareCard was visually flat — no
immediate signal of "which slice belongs to which entity," and the
vertical stack burned a lot of scroll-height per category. A previous
attempt at full overlay (a percentile-tier annulus on the primary
chart, 2026-05-14) had been reverted as "visually noisy / muddy."

Redesign as a **mirror-halves butterfly**: one chart per category,
split vertically, primary entity on the left semicircle, compare
entity on the right. Spatial separation (left vs right) does the
attribution work — no overlay muddiness possible — while the existing
percentile-tier colors stay intact on both sides.

## What Was Done

### New chart primitive

`src/components/solid/ButterflyChart.tsx` (+ `.css`) — a Solid SVG
chart sharing geometry primitives with PizzaChart via
`src/lib/charts/arc-math.ts`. Each side gets a 180° span split into
N slices. Hover is **linked**: hovering a slice on either side adds
`.is-hovered` to the whole pair, so both mirrored slices light up
together and the user can read both entities' values for a stat in
one motion. Missing data on one side renders as a faint dashed
outline with an em-dash inside — the pair stays intact rather than
being dropped, so comparison context isn't lost. Tinted half-discs
(`--compare-primary-bg` left, `--compare-secondary-bg` right, 0.85
opacity) sit behind everything as a passive attribution cue, plus a
thin hairline divider along the vertical axis.

### CompareCard rewire

`src/components/solid/CompareCard.tsx` now:

- Replaces the per-category dual-PizzaChart `ChartCell` with a single
  ButterflyChart per category, fed by a new `buildButterflyStats`
  adapter that pairs primary + compare `chartStats` by stat key.
- Falls back to a single PizzaChart per category when no compare
  entity is picked yet — same calm empty state as the StatsCard.
- **URL-persists the compare entity** as `?vs=<id>` via `useSearchParams`.
  The compare selection survives refresh, is shareable, and clearing
  it removes the param. Hydration on mount looks the entity up in
  the same `entityDataStore` index `CompareSearch` already uses.
- Renders a **per-entity cohort disclaimer** under each pill —
  "Compared to {position}s" using `pickCohortPosition` from project 1
  — surfacing that two players may be benched against different
  backend cohorts. Hides for teams or when `position_group` is null.
- Renders a **two-swatch legend** above the first butterfly:
  periwinkle dot + primary name · mauve dot + compare name. Quiet
  italic-tone, only shown when a compare entity is picked.
- Pulls the primary entity name from the bundled entity index when
  the stats payload doesn't carry one (Cunningham's response, for
  instance, ships `name: null` — the new fallback keeps the pill,
  cohort line, and legend label populated).

### Skeleton

`CompareCardSkeleton` now matches the butterfly silhouette: four
circular shape skeletons stacked, each with a faint vertical divider
line down the middle to evoke the split. Sized to the typical
4-category case for predictive CLS.

## Files Changed

```
src/components/solid/ButterflyChart.tsx                 (NEW)
src/components/solid/ButterflyChart.css                 (NEW)
src/components/solid/CompareCard.tsx
src/components/solid/CompareCard.css
docs/progress/2026-05-21_compare-butterfly.md           (NEW)
```

`arc-math.ts` and `stats-categorizer.ts` are reused unchanged.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 110/110 passing.
- Browser sweep via headless Chromium against the live dev server:
  - **Cunningham (NBA) alone** — empty state falls back to 5 PizzaCharts; primary pill + cohort line ("Compared to G-Fs") render.
  - **Cunningham vs Maxey** — 5 butterflies, legend shows both names, both pills show their own cohort line ("Compared to G-Fs", "Compared to Gs"); 0 PizzaCharts.
  - **URL persistence** — reload of `?vs=3547254` preserves the comparison fully.
  - **Prescott vs Rodgers (NFL)** — 4 butterflies, both pills show "Compared to Quarterbacks".
  - **Team profile** — no cohort line; falls back to PizzaCharts (no compare entity, by design).
  - **Hover linking** — hovering `.butterfly-side-left` lifts the whole `.butterfly-pair.is-hovered` so the right mirror highlights too.
  - **Zero console / page errors** across all six routes.
- Visual review with the user: half-disc background opacity bumped
  from 0.55 → 0.85 to make the periwinkle / mauve attribution cue
  more present without becoming loud.

## Result

The CompareCard now reads at a glance: left is always entity A,
right is always entity B, mirrored stat-by-stat. The percentile-tier
narrative survives unchanged on each side, the cohort disclaimer
makes apples-vs-oranges comparisons visible (e.g. comparing a Guard
to a Forward shows different cohort labels under each pill), and
the URL is shareable. One-chart-per-category drops the per-card
vertical footprint roughly in half compared to the stacked pair.

## Strategic fallback (per plan)

If the butterfly proves harder to read in real use than the
verification suggests (likely failure mode: too many stats per
category → each wedge gets too narrow), the planned fallback is
**concentric paired rings** (direction A from the brainstorm) —
inner band = primary, outer band = secondary. The CompareCard
plumbing (data adapter, URL persistence, cohort disclaimer, legend,
skeleton) would carry over unchanged; only the chart primitive
swaps. ButterflyChart is self-contained enough that this would be
a focused follow-up if needed.
