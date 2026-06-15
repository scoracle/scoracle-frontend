# 2026-06-15 — News card on the news rail (narratives + All/Transfers scope)

## Goal
Rework the News card from the old article+tweet feed to the two-rail **news rail**: render the
entity's Gemma narratives with an All / Transfers content-type scope, fed by one `/{type}/{id}/news`
fetch (B6b of the two-rail frontend migration).

## What Was Done
- **Data layer**: `newsRailUrl()` in `data-sources.ts`; new `news-rail.server.ts` exposing
  `getNewsRail` + the `NewsRailResponse` types (narratives, transfers, vibe{current,history}).
- **NewsCard.tsx**: reads `getNewsRail` once; "All" scope renders the narratives (headline + impact +
  the write-up via `<GemmaSummary>`), "Transfers" scope reuses the exported `<TransferRow>` from
  TransfersCard. The scope toggle is an inline `<NavStrip>` in a `<ScopeStrip>`, shown only when the
  entity has transfers. The vibe rides in the same rail for the Vibe card (not shown here).
- `TransfersCard.tsx`: `TransferRow` is now exported for reuse.
- `card-registry.tsx`: News preload → `getNewsRail` (matches the card's read).
- `NewsCard.css`: narrative styles (`.news-narratives`, `.narrative`, impact metric); dropped the old
  article-feed classes.

## Files Changed
- `src/lib/utils/data-sources.ts`, `src/lib/data/news-rail.server.ts` (new),
  `src/components/solid/{NewsCard.tsx, NewsCard.css, TransfersCard.tsx, card-registry.tsx}`

## Verification
- `npm run typecheck` clean; `npm run build` clean (`news-rail.server` bundles).
- Backend `/{type}/{id}/news` live + verified (Chelsea: 4 narratives + 14 transfers + vibe).
- Visual/dev verification pending before `cf:deploy`.

## Result
The News card now reveals the narrative (the product's core value), with transfers as a scope of the
same rail. First card on the two-rail data flow.
