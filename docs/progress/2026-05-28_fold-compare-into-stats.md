# 2026-05-28 — Fold the Compare tab into the Stats tab (+ post-merge cleanups)

## Goal

Compare was 99% the Stats card — same `getStats` data, same toolbar, same charts —
differing only by the entity search bar + butterfly comparison graphs. Collapse it
into Stats so there's one card, not two near-duplicates behind separate tabs. Then
audit the surrounding area for the redundancies the merge exposed.

## What Was Done

- **Unified card** (`StatsCard.tsx`): absorbed CompareCard's logic — URL-backed
  compare entity (`?vs=<id>` / `?vsSeason=<N>`), the `CompareSearch` bar, paired
  season selectors, and `ButterflyChart`. With no compare entity it renders the plain
  single-entity pizza view; pick a second entity and each category swaps to a
  butterfly. Kept Stats' deliberate "season selector reachable on an empty-stats
  season" behavior by holding the header (pill + seasons + search) OUTSIDE the
  `hasCharts()` gate — only the rate/scope toolbar, legend, and charts are gated.
- **Deleted** `CompareCard.tsx` + `CompareCard.css`; folded the compare styles into
  `StatsCard.css`; removed a now-dead `.category-chart-cohort` rule.
- **Dropped the Compare tab**: removed from `ContentShell` (pane + nav item),
  `ProfileTab`, and `VALID_TABS`. An old `?tab=compare` deep link now falls back to
  `stats` (where the compare view lives) and its `?vs=` still resolves there;
  `profile-tabs.test.ts` updated to assert the fold.
- **Cleanups surfaced by the audit:**
  - Deduped `resolvePositionGroup` — was byte-identical in StatsCard + TraitsCard
    (3 copies before the merge) — into `stats-categorizer.ts`, beside its sibling
    `pickCohortPosition`.
  - Extracted `<ScopeStrip>`: the All-`<SPORT>` / scope toggle shared by Stats +
    Traits, self-gating so it drops into either card's toolbar. Removed the
    duplicated inline NavStrip + dead `sportLabel` memos.
  - Fixed stale doc-comments naming the deleted `CompareCard` across sibling files.

## Files Changed

`components/solid/StatsCard.tsx` (+`.css`), `CompareCard.tsx`/`.css` (deleted),
`components/solid/ScopeStrip.tsx` (new), `components/solid/ContentShell.tsx`,
`components/solid/TraitsCard.tsx` (+`.css`), `components/solid/PizzaChart.tsx`,
`components/solid/SeasonSelect.tsx`, `contexts/profile.ts`,
`lib/utils/stats-categorizer.ts`, `lib/utils/profile-tabs.ts` (+`.test.ts`),
`lib/data/stats.server.ts`, `routes/profile.tsx`, `CLAUDE.md`. Net ≈ −296 lines.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 138/138 pass.
- `npm run build` — client + server bundles build clean.
- SSR `/profile?...&tab=stats` returns 200 with `og:image=/og/stats/...` (no compare).
- Not browser-verified (no Go backend at `:8000` in this env) — butterfly layout +
  header alignment should get a real browser pass.

## Result

One Stats card now hosts the compare search + butterfly charts; Compare is no longer a
separate tab. The merge exposed and removed real duplication (`resolvePositionGroup`,
the scope toggle) without over-abstracting (no shared data hook — islands still own
their data).
