# 2026-05-23 — CompareCard per-category share + compare OG route

## Goal

Wire `<ShareTrigger>` inside each per-category CompareCard Shell
and add the matching compare OG route so the shared PNG carries
both entities' meta (top-left primary, top-right compared) plus
a pizza chart with the compared entity overlaid as dashed wedges
in the same slices.

This is the last commit of the unified card-share rebuild.

## What Was Done

### NEW — `src/routes/og/compare/[cardType]/[sport]/[type]/[id]/vs/[type2]/[id2].ts`

The compare OG route. URL shape:

```
/og/compare/{cardType}/{sport}/{type}/{id}/vs/{type2}/{id2}
```

Where `cardType` is `compare:{slot}` (slot ∈ CHART_SLOTS).
Pipeline:

1. Validate cardType prefix + slot membership in `CHART_SLOTS`.
2. Five parallel fetches: frame asset, two entity-fact pulls
   (primary + compared), two stats pulls (primary + compared).
3. Two image-data-URI fetches (one per entity) — gated on each
   entity's `imageUrl` being non-null.
4. Per-entity categorization via `categorizeForCharts`, then find
   the requested slot in each.
5. Build the pizza body with primary stats as wedges + compared
   stats as the dashed overlay (`pizzaBodySvg({title, stats,
   compared, cohort})`).
6. Compose into the vertical tarot frame with both entity header
   blocks (`primary` top-left, `compared` top-right).

Canonical URL preserves the `vs=` query param so a recipient
clicking through lands on the same comparison.

### MODIFIED — `src/components/solid/CompareCard.tsx`

Added `<ShareTrigger>` inside each per-category Shell. The
metadata changes shape based on `hasCompare()`:

- No compared entity → `stats:{slot}` (same as a regular StatsCard
  share — the visible chart is a single pizza, and the OG URL goes
  to the standard /og/stats:... route).
- With compared entity → `compare:{slot}` + `comparedEntity` field
  populated, which routes ShareTrigger to the new compare OG URL
  and yields the dual-entity tarot card.

`entityName` resolved via the existing `primaryName()` memo (already
in the file for the legend / pill).

## Files Changed

```
src/routes/og/compare/[cardType]/[sport]/[type]/[id]/vs/[type2]/[id2].ts  (NEW)
src/components/solid/CompareCard.tsx                                       (ShareTrigger wiring)
docs/progress/2026-05-23_compare-share-route-and-card.md                   (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 118/118 passing.

## Result

CompareCard per-category Shells are shareable. With no compared
entity selected, sharing yields the standard solo Stats artifact
(the chart in-app is a single pizza, matching). With a compared
entity, sharing yields the dual-entity tarot card — primary's
meta top-left, compared's meta top-right, pizza chart with the
primary as solid wedges and the compared as dashed overlay.

Post copy: "Check out {entity}'s {category} comparison report"
with sport-aware category mapping.

The unified card-share pattern is complete. Architecture-uniform
(`ShareTrigger` inside any Shell), legacy infra junked
(`ShareButton` + `intents.ts` + landscape composer gone), and the
share PNG attaches directly to social posts via the Web Share API
on ~90% of browsers (mobile Safari/Chrome, desktop Safari/Chrome/
Edge), falls back to a download+composer modal on Firefox.

## What's NOT in this commit (intentional)

- **Butterfly chart in the share artifact** — the in-app compare
  uses ButterflyChart, but the share artifact uses pizza-with-
  overlay. Pizza-overlay reads better in a thumbnail than a wide
  mirror layout, and the data shape is the same. If the user wants
  butterfly-as-artifact later, add `butterflyBodySvg` alongside
  `pizzaBodySvg` and switch the compare route's call site.
- **Rate-mode (per-36 / per-90) compare share** — same as solo
  StatsCard: per-game data only. Rate variants can land later via
  a query param.
- **Scoped percentile compare share** — same: "all" percentiles
  only.
- **TraitsCard share** — not in V1 scope. ShareTrigger architecture
  supports it; just declare `cardType: "traits"` and add a traits
  body renderer (a simple two-column high/low list).
