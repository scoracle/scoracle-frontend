# Team template pizzas — doc-comment alignment with backend 056

**Date:** 2026-06-10
**Pairs with:** backend migration 056 (`scoracle-backend/progress_docs/2026-06-10_056-team-templates.md`)

## Goal

Backend migration 056 flips the team Composite (all three sports, Regular model)
from z-pizzas to offense/defense counting-stat template pizzas. The 055 template
machinery in this repo (`template()`, `pizzaGroups`, `toTemplateStat`,
`cardScore`) is entity-agnostic and the team facets match `rating_categories`
keys — so **zero code changes were needed**. This commit aligns the doc comments
that claimed the template/datapoints payload blocks were players-only.

## What was done

- **`sparkline.server.ts`** — `template` / `datapoints` field docs now read
  "Players + teams" (047 + 055 + 056), noting teams are `default`-mode only
  (no rate modes; `templateForMode` falls back) and the team `scoped_pct`
  cohort keys (`conference` NBA/NFL, `league` football). `TemplateStat.facet`
  + `DatapointStat` docs updated to match.
- **`CompositeCard.tsx`** — header comment gains the teams paragraph: teams
  render offense/defense template pizzas whose facet keys line up with
  `rating_categories`, per-facet sub-score footers unchanged, z-pizza fallback
  when a sport's team template rows are deleted.

## Files changed

- `src/lib/data/sparkline.server.ts` (comments only)
- `src/components/solid/CompositeCard.tsx` (comments only)

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright against the locally-migrated API (`PUBLIC_GO_API_URL` → :8099):
  - NFL team (Patriots): offense pizza (Points For 557/93.5, turnovers inverse
    at pct 29) + defense pizza (Total Tackles 1361/97), footers OFFENSE: 87.1 /
    DEFENSE: 87.1 (verified genuinely equal in rating_categories).
  - NBA team (Hawks): 6-wedge offense (Assists 29.6/97) + 5-wedge defense,
    footers 82.8 / 65.5.
  - FOOTBALL team (West Ham): 7+7 wedges, footers 13.7 / 77.9.
  - Player regression: NFL QB single offense z-pizza + composite footer,
    football GK Shot-Stopping/Passing template pizzas — both unchanged.

## Result

Team Composite cards across all three sports render real counting stats grouped
by offense/defense, driven entirely by `stat_templates` rows — no frontend code
change, reversible per sport by deleting the seed rows. Ships with the backend
056 prod apply + the share-unplug edit in one cf:deploy.
