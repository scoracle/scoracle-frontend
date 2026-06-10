# Counting-stat pizza re-ranks by cohort scope

**Date:** 2026-06-10

## Goal

Make the cohort-scope selector actually re-rank the counting-stat pizza slices
(the reported "position scopes not working"). The selector + headline already
worked; the template/datapoints pizza slices were frozen because the template
block carried only the within-position percentile. Backend migration 058 adds a
per-cohort `scoped_pct` to every slice — this wires the frontend to honor it.

## What was done

- **`sparkline.server.ts`** — `TemplateStat` gains `scoped_pct?: Record<string,
  number> | null` (the per-cohort percentiles: {all, position?, conference?,
  division?, league?}, keys per sport from migration 058).
- **`CompositeCard.tsx`** — unified the slice-percentile reader into `scopePct(s,
  scope) = s.scoped_pct?.[scope] ?? s.pct` (replacing the z-pizza-only `slicePct`).
  Both the z-pizza (`toStat`) and the counting-stat template (`toTemplateStat`,
  now scope-parameterized) re-rank within the active cohort. `'all'` reads the
  positionless cohort where stored (template) or the positionless base pct
  (z-pizza) — uniform. The "template wedges are within-position, selector affects
  only the headline" caveat is removed.

The scope dropdown (`ContentShell.scopeOptions`) and `SCOPE_LABEL` already read
`rating_scoped_ranks` keys + prepend "All" — migration 058 populates the new
per-sport cohorts there, so NFL players gain By Conference/By Division, NBA/Football
gain By Conference/By League, teams gain By Conference/By Division — no ContentShell
change needed.

## Files changed

- `src/lib/data/sparkline.server.ts`
- `src/components/solid/CompositeCard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright (local API on the 058-migrated DB): toggling a football attacker's
  scope All → By League moves the **template** Assists slice 84 → 93 (matches the
  API all=84.2 / league=93.4); an NFL QB's headline re-ranks By Conference 47.4 /
  By Division 60.0 with the z-pizza slices following.

## Result

The counting-stat pizza re-ranks within the selected cohort for players (NFL/NBA/
football) and teams. Ships with backend migration 058 in the same cf:deploy.
