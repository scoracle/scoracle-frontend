# Football template pizzas — GK hardcode becomes data

**Date:** 2026-06-10
**Pairs with:** backend migration 055 (`scoracle-backend/progress_docs/2026-06-10_055-player-datapoints.md`)

## Goal

Render the backend's new faceted football templates as counting-stat pizzas on the
Composite card — one pizza per facet (Shot-Stopping/Passing for GKs;
Attacking/Passing/Defending for outfielders) — and delete the hardcoded GK
label-allowlist pizza it replaces. Wire the new generic `datapoints` payload block
into the types (nothing renders it yet — it's the data layer for future surfaces).

## What was done

- **`sparkline.server.ts`** — `TemplateStat` gains `facet: string | null`;
  new `DatapointStat` interface + `SparklineRating.datapoints` (default mode only,
  per the locked decision); doc comments updated for 047+055 semantics.
- **`CompositeCard.tsx`** —
  - `template()` accessor: Fantasy model renders any template as before; Regular
    model renders the template ONLY when items carry facets (football). Unfaceted
    NFL/NBA templates stay Fantasy-only — NFL Regular keeps its z facet-pizzas.
  - `pizzaGroups` groups template items by `facet` via an insertion-ordered Map —
    items arrive pre-sorted by `sort`, so facet order follows the seeded curation.
  - `FACET_LABEL` gains attacking/passing/defending/shot-stopping/fantasy.
  - **Deleted** `GK_LABELS` / `GK_PASSING_LABELS` / `isFootballGK` — the GK pizza is
    now template rows in the DB. `eligible` simplifies to the facet filter; the
    z-pizza remains the fallback for templateless positions (football NULL-position,
    NFL defense, NBA stays z because its template is unfaceted).
- **`sparkline.test.ts`** — fixtures gain `facet: null` / `datapoints: null`.

Not touched (deliberate): `og-bodies.ts` (OG composite still renders the flat z-list
with its own GK filter — noted follow-on) and `SpecialistCard.tsx` (z-based by design).

## Files changed

- `src/lib/data/sparkline.server.ts`
- `src/components/solid/CompositeCard.tsx`
- `src/lib/data/sparkline.test.ts`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright against the locally-migrated API (`PUBLIC_GO_API_URL` override):
  - GK (Joan García) renders Shot-Stopping + Passing pizzas, correct values/pcts;
    per_90 rescales wedges (`Saves 3.737 83`) while `save_pct` stays invariant.
  - Attacker renders Attacking/Passing/Defending pizzas.
  - Regression sweep: NFL QB Regular `["Offense"]` (z, unchanged), NFL QB Fantasy
    `["Fantasy"]` (single template pizza, unchanged), NBA Regular `["Rating"]`
    (flat z-pizza, unchanged).

## Result

Football Composite now shows real counting stats grouped by facet, driven entirely by
`stat_templates` rows — reversible by deleting the seed rows (card falls back to the
z-pizza). Ships with the backend 055 apply + cf:deploy (deploy after the prod
migration so the payload carries `facet`/`datapoints`).
