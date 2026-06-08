# 2026-06-07 — Scoped pizza/butterfly slices + position in meta

## Goal
The position scope re-ranked only the Composite headline; the pizza SLICES still
showed positionless percentiles. Make the slices re-rank within the position cohort
"the same way the per-x ones already do" — and surface the player's position in the
meta (it had gone missing): the profile EntityMeta detail and the OG share-card
subtitle (`position · team`).

## What Was Done
- **`sparkline.server.ts`** — `RatingDatapoint` gains `scoped_pct?: Record<string,number>|null`
  (backend migration 043): the per-scope percentile of that datapoint within the
  cohort, parallel to `pct`. Rides on both the default breakdown and every
  `rating_modes[].breakdown` (per-X × position compose).
- **`CompositeCard.tsx`** — new `slicePct(d, scope)` = `scope!=="all" && d.scoped_pct?.[scope]
  != null ? d.scoped_pct[scope] : d.pct`. `toStat` takes `scope`; the pizza
  (`g.items.map(d => toStat(d, ctx.scope()))`), the discipline/squad chips, and the
  **CompareView butterfly** stats all read `slicePct` so they re-rank with the scope
  dropdown. Composes with the Per-X mode (still selects the `ratingForMode` block first).
- **`og-bodies.ts`** — same `slicePct` helper; `compositeBody` slices + `compareBody`
  butterfly pcts honor `ctx.scope` (the OG route already threads `?scope=`).
- **`og/entity-facts.server.ts`** — player OG subtitle is now `position · team`
  (was team only), mirroring the in-app EntityMeta. Reads `position` from the bundle.
- **Regenerated bundles** (`public/data/*`) from the live API now that `/meta` serves
  position (backend 044): NBA 1231/1311, NFL 2211/5344, FOOTBALL 8210/8268 players
  carry position — fixes the EntityMeta "Position" row + OG subtitle.

## Files Changed
`src/lib/data/sparkline.server.ts`, `src/components/solid/CompositeCard.tsx`,
`src/lib/cards/og-bodies.ts`, `src/lib/og/entity-facts.server.ts`,
`public/data/{nba,nfl,football}.json` + `*-meta.json`.

## Verification
- `npm run typecheck` clean; `npm test` → 111 pass.
- Live API spot-check (NBA 177, Aaron Gordon, F): `scoped_pct` present per datapoint;
  `per_36` mode carries its own `scoped_pct`.
- Browser (dev): `/profile?sport=NBA&type=player&id=177` default vs `?scope=position`
  — pizza slices visibly re-rank (Playmaking 48→64, Rim Protection 25→~15, Ball
  Security 75→68), headline "GENERAL · POSITION: 76.9", scope dropdown reads "By
  Position", and POSITION: F shows in the meta. OG verifies post-deploy (resvg wasm
  renders in prod only).

## Result
Selecting "By Position" now re-ranks the whole Composite surface — headline AND every
slice — within the player's position cohort, exactly parallel to Per-X, on both the
in-app pizza/butterfly and the OG share cards. Player position is back in the meta.
