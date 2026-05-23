# 2026-05-23 — StatsCard per-category share + pizza body

## Goal

Wire `<ShareTrigger>` inside each per-category Stats Shell with
`cardType: "stats:{slot}"` metadata, and add the matching pizza
SVG body renderer to the OG route so the share PNG actually shows
the chart (not just a placeholder).

Five per-sport categories: attack / possession / defense /
discipline / setpiece. Each populated category Shell becomes its
own shareable artifact.

## What Was Done

### NEW — `src/lib/og/cards/pizza.ts`

Pure SVG pizza chart renderer for the 800×800 body area. Each
stat is a wedge whose radial length is `percentile / 100 × maxR`,
filled with the matching `--percentile-*` tier color (hex
mirrored from `tier-color.ts` for SVG-context).

- 5 concentric guide rings (20/40/60/80/100)
- N wedge separators (radial spokes)
- Stat label + value at the perimeter (anchor flips on the
  vertical axis so labels read inward on both sides)
- Optional `cohort` line at the bottom ("Compared to point guards")
- Optional `compared` overlay (dashed inner wedge per stat) for the
  CompareCard route (commit 7 wires this)

Title at top is the category label upper-cased ("ATTACKING").
"No data" fallback when stats list is empty.

### MODIFIED — `src/routes/og/[cardType]/[sport]/[type]/[id].ts`

Added `cardType.startsWith("stats:")` branch in
`resolveCardContent`. Pipeline:
1. Parse slot from `stats:{slot}` (validated against `CHART_SLOTS`).
2. Fetch stats via `getStats`.
3. `categorizeForCharts` → find the matching category by `id`.
4. Convert category.stats to PizzaStat shape (filter out nulls).
5. `pickCohortPosition` for the cohort line.
6. Call `pizzaBodySvg({ title: cat.label, stats, cohort })`.

Also restructured the parallel-fetch — vibe data is now fetched
inside the vibe branch (not always-fetched), since stats branch
doesn't need it.

### MODIFIED — `src/components/solid/StatsCard.tsx`

Added `<ShareTrigger>` inside each per-category Shell via the
`<For>` loop. Each trigger's metadata:

```ts
{
  cardType: `stats:${slot.category.id}` as CardType,
  entity: { sport, type, id },
  entityName: entityName(),
  tab: "stats",
}
```

`entityName` resolved via `readShareEntity` (same pattern as
VibeCard).

## Files Changed

```
src/lib/og/cards/pizza.ts                                       (NEW)
src/routes/og/[cardType]/[sport]/[type]/[id].ts                 (stats:* dispatch)
src/components/solid/StatsCard.tsx                              (ShareTrigger wiring)
docs/progress/2026-05-23_statscard-per-category-share.md        (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 118/118 passing.

## Result

Each Stats per-category Shell has its own share button. Click →
fetch `/og/stats:{slot}/{sport}/{type}/{id}` → returns the 1000×1400
tarot card with the pizza chart in the body slot, primary entity's
name + position/team in the header, scoracle.com + date in the
footer.

Post copy: "Check out {entity}'s {category} report" with category
mapped sport-aware per `categories.ts` (set pieces / special teams /
dead ball).

## What's NOT in this commit (intentional)

- **CompareCard wiring** — commit 7. Needs the compare OG route
  + compare PNG URL shape + compared-entity meta in the pizza
  overlay (which `pizza.ts` already supports via the `compared`
  field; just unwired today).
- **Rate-mode (per-36 / per-90) share** — currently rate slots also
  declare `stats:{slot}` cardType; the OG route uses per-game data.
  Acceptable for v1; per-mode share variants can land later.
- **Scoped (conference) percentile share** — same: OG uses "all"
  percentiles; scoped variant can pass `?scope=scoped` later.
