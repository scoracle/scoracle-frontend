# 2026-06-03 — Card pillar: teardown (prune accumulated card/share cruft)

## Goal

First step of the Card-pillar refactor (design: `~/scoracleWiki/wiki/Architecture/Card
Pillar.md`): a pure-subtraction pass that deletes the retired-era card/share code that
accumulated from earlier symptom-fixing, so the tree is honest before the registry +
shared-body build lands. Zero behavior change to live surfaces.

## What Was Done

Verified each target was a closed dead set (no live importers) before cutting:

- **Retired-tab components** (Stats/Traits tabs retired 2026-06-02): deleted `StatsCard.tsx`,
  `TraitsCard.tsx`, `ScopeStrip.tsx` (ScopeStrip was used only by the other two).
- **Dead OG scaffolding**: deleted the compare OG route
  (`routes/og/compare/.../vs/...`), the `resolveStatsSlot` function + `stats:` branch in the
  `/og/[cardType]` handler, and `og/cards/pizza.ts` (orphaned once both consumers went —
  it also duplicated wedge math the in-app pizza already owns via `lib/charts/arc-math.ts`).
- **Orphaned data path**: deleted `lib/data/stats.server.ts` (`getStats`) and
  `lib/utils/stats-categorizer.ts` (+ its test) — every importer was in the teardown set.
- **Stale taxonomy**: pruned `lib/share/categories.ts` to the one live shareable card
  (`vibe`); dropped the retired `stats:`/`compare:`/`traits`/`trends` `CardType` members and
  the `stats-categorizer` dependency. Trimmed `categories.test.ts` + `text.test.ts` to the
  live cases. Refreshed a stale `share-url.ts` doc comment.
- **Kept** `StatsCard.css` (CompositeCard still imports it) and `lib/utils/profile-tabs.ts`
  (`deriveInitialTab` — healthy, already lists the correct 8 tab ids).

## Files Changed

Deleted: `components/solid/{StatsCard,TraitsCard,ScopeStrip}.tsx`,
`lib/og/cards/pizza.ts`, `lib/data/stats.server.ts`,
`lib/utils/stats-categorizer.ts(+.test.ts)`, `routes/og/compare/**`.
Edited: `routes/og/[cardType]/[sport]/[type]/[id].ts` (imports, `stats:` branch,
`resolveStatsSlot`, `tabForCard`, doc), `lib/share/categories.ts(+.test.ts)`,
`lib/share/text.test.ts`, `lib/utils/share-url.ts` (comment).

## Verification

`npm run typecheck` clean. `npm test` → 13 files, 97/97 pass (down from 102: removed the
stats-categorizer suite + retired share-copy cases). Final grep confirms zero surviving
references to any deleted module.

## Result

The retired-tab + dead-compare/stats stratum is gone; the live surfaces (Composite /
Specialist / Starline / Vibes / News / Leaders / Roster / Transfers, VibeCard share, the
vibe + meta OG bodies) are untouched. Clean base for the next step: the Card Registry +
`<Card>` component + shared pure-SVG body modules.
