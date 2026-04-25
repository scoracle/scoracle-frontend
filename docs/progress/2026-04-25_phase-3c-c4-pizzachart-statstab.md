# Phase 3c, Commit 4 — PizzaChart + StatsTab

**Date:** 2026-04-25
**Scope:** Largest commit in Phase 3c. Port the SVG pizza chart and the stats-tab content (~33 KB combined source). Both verbatim ports apart from one cleanup: drop the legacy vanilla-JS bridge from PizzaChart.

## Goal

Land the stats core. PizzaChart is the load-bearing visualization for the percentile model; StatsTab is the consumer that fetches `/api/v1/{sport}/{type}/{id}`, runs the data through `stats-categorizer` to produce the four-slot grid, and renders the box score + form badges + home/away breakdown.

## What Was Done

### `PizzaChart.tsx` (439 → 386 LOC after dropping the bridge)

Verbatim port of the main `PizzaChart` component (declarative SVG over `<For>` with arc math from `lib/charts/arc-math`). Sub-components: `SliceLabel`, `PercentileLabel`, `SingleChart`, `ComparisonChart`. CSS variables (`--percentile-elite`, `--chart-ring`, `--compare-primary`, `--compare-secondary`, etc.) referenced directly in SVG fill/stroke attrs — theme changes are automatic without a refresh call.

**Dropped: `createPizzaChartBridge()`.** The bottom of the Astro file exported a vanilla-JS mount adapter using `render` from `solid-js/web`. Its only consumer was `StatsComparisonContent.astro`, which was the deactivated comparison-page-takeover feature (`[COMPARISON DEACTIVATED]` marker in `~/Scoracle/src/pages/profile.astro`). The new compare flow is `CompareTab.tsx` (lands in C6) — a Solid component, not a vanilla-JS embed. No remaining consumers of the bridge, so the import of `render` and the entire `createPizzaChartBridge()` function are gone. Cleaner intent ("this component is Solid-only") and a couple fewer KB.

### `StatsTab.tsx` (462 LOC, verbatim) + `.css` (465 LOC, verbatim)

Big component. Highlights:

- Reads URL params at setup via `parseEntityParams()` — same SSR landmine as EntityMeta and the news-card tabs. Wraps will land in C7.
- `swrFetch(statsUrl(sport, type, id), CACHE_PRESETS.stats)` for the data; `unwrapEntityPayload` handles the Go API's `{ entity: {...} }` envelope shape.
- Runs the response through `categorizeStats`, `categorizeForCharts`, `categorizeRateForCharts`, `getBoxScoreGroups` from `lib/utils/stats-categorizer` (zero-diff verbatim from Phase 3a).
- Four-slot grid hard-coded in `categorizeForCharts`: Attack / Possession / Defense / Discipline (locked grid per the 2026-04-19 changelog row).
- **Player-only:** rate toggle (Per Game / Per-36 or Per-90 depending on sport) using a nested 2D card flip (`charts-flip-container`, `charts-flip-inner`, `charts-flip-front/back`). Driven by an effect that reads `scrollHeight` of the active face — DOM-coupled but only fires after refs are bound (client-only, SSR-safe via short-circuit guard).
- **Team-only:** `Home/Away Breakdown` collapsible (`<details>`) and form-string badge strip (W/D/L pills, last 5 games).
- Publishes the resolved payload to `$statsData` nanostore + `setPageData('stats', ...)` so TraitsTab (C5) and CompareTab (C6) can consume without re-fetching.

## Future improvements tracked (per the strategic discussion before this commit)

The PizzaChart implementation was kept verbatim. Five improvements were identified as worth investing in *without* swapping libraries; queued as separate, focused follow-up commits when product is ready:

1. **Entry animation** — slices grow from `innerRadius` to final radius (~250 ms reveal). `solid-transition-group` is already installed; ~30 LOC. Big perceived-snappiness win.
2. **Hover/focus tooltips** — `hovered: PizzaChartStat | null` signal; positioned `<g>` group with stat name + value + percentile rank. Removes the truncated-label problem on long stat names. ~40 LOC.
3. **Reduced-motion respect** — `@media (prefers-reduced-motion: reduce)` to disable animations. One CSS rule; depends on improvement 1 landing first.
4. **Accessibility** — `role="img"` + `<title>` + `<desc>` summarizing top-3 percentiles. Important for screen-reader users; near-free.
5. **Layered legibility** — faint percentile-ring overlay (25 / 50 / 75 dotted concentric rings) so absolute percentile is readable without hovering.

These are additive; none requires changing the data flow or breaking the API.

The strategic decision against swapping to a chart library is captured in the conversation history — short version: "pizza chart" is a domain-specific sports-analytics pattern (StatsBomb / FBref); no mainstream library has it natively. Switching to Chart.js / ApexCharts / @unovis/solid would mean reimplementing the math on top of a 50–300 KB wrapper that doesn't natively support the pattern, then theme-overriding back to the brand aesthetic. Same end result, more bundle, more maintenance.

If a portfolio of chart types ever shows up (season trend, stat distribution, head-to-head bars), revisit the library question — for the pizza chart alone, custom is right.

## Files Changed

Added (3):
- `src/components/solid/PizzaChart.tsx`
- `src/components/solid/StatsTab.tsx`
- `src/components/solid/StatsTab.css`

Plus `docs/progress/2026-04-25_phase-3c-c4-pizzachart-statstab.md` (this file).

## Verification

- Pre-port: `statsUrl`, `unwrapEntityPayload` confirmed in `data-sources.ts`. `categorizeStats`, `categorizeForCharts`, `categorizeRateForCharts`, `getRateLabel`, `getBoxScoreGroups`, `Category` type all confirmed in `stats-categorizer.ts` (zero-diff verbatim from Phase 3a). `polarToCartesian`, `describeArc`, `truncateLabel`, `sliceRadius`, `percentileTierVar`, `textAnchor` confirmed in `arc-math.ts`.
- `npm run typecheck` → clean.
- `vite dev` → boots in ~250 ms.
- All four existing routes still serve unchanged (none of these components are imported by a route yet).

## Result

Stats core is in tree. The dependencies are: `StatsCard` (C5) consumes `StatsTab` + `TraitsTab`; `CompareTab` (C6) consumes `PizzaChart`'s comparison mode. Both will drop in cleanly.

Half of Phase 3c shipped. Three commits remain: C5 (StatsCard + TraitsTab), C6 (CompareTab), C7 (wire profile.tsx), C8 (audit).
