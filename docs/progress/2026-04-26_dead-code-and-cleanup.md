# Dead-code purge + small cleanups

**Date:** 2026-04-26
**Scope:** Audit findings #10 (Low / S), #11 (Low / S), #14 (Low / S, partial), #15 (Low / S). One pass through the carry-forward debris, removing what's confirmed-unused and consolidating what's duplicated.

## Goal

After the High-severity refactors, several files and exports were left visibly orphaned: helpers from the Astro era that no Solid component uses, URL builders no consumer references, and a Phase-2 smoke route whose own header says "Delete once exercised in production traffic." Same pass also folds in two minor consolidations that are effectively cleanup: `normalizePercentiles` was duplicated verbatim across two tabs (#14 partial), and `VibesTab`'s `metaReady` ladder was overhead the meta load doesn't need (#15).

## What Was Done

### Files deleted

- `src/lib/utils/autocomplete.ts` — entire file. Astro-era class. Zero importers.
- `src/lib/utils/dom.ts` — entire file. Contained `escapeHtml` (Solid auto-escapes JSX), `parseEntityParams` (now unused after the ProfileContext refactor), `showState`, `showWidgetState` (Astro-era imperative state-toggle helpers). Zero importers after the recent `parseEntityParams` consumers all switched to `useProfile()`. The `getSportDisplay` re-export was redundant — consumers can import directly from `lib/types`.
- `src/routes/smoke-transition.tsx` — Phase-2 verification artifact. The transition library has been exercised in production at `https://scoracle-frontend.albapepper.workers.dev` for the entire commit window since `52ea0c9`. Per the file's own self-deletion comment, time's up.

### Dead exports stripped from `src/lib/utils/data-sources.ts`

- `profileUrl` (alias for `entityUrl`) — zero consumers.
- `twitterSportFeedUrl` — zero consumers.
- `vibeHistoryUrl` — zero consumers.
- `statsUrl` (one-line alias for `entityUrl`) — single consumer (StatsTab) was inlined to call `entityUrl` directly. Drops the trivial alias (#11).

### `normalizePercentiles` deduped (#14, partial)

- Moved the function (10 LOC) into `src/lib/utils/stats-categorizer.ts` next to the rest of the percentile/category logic, where it logically belongs.
- StatsTab and CompareTab import it from there. Both files lose their local copy.
- `categoryToChartStats` is also duplicated between StatsTab and CompareTab, but extracting it would force the `PizzaChartStat` interface (currently in `PizzaChart.tsx`) to migrate to a shared types file, which is a bigger move than the dedup is worth at two callsites. Per the project's "three similar lines beats premature abstraction" rule, that one stays inlined.

### `VibesTab` metaReady ladder simplified (#15)

The component had a separate `metaReady` signal flipped by a `createEffect` that called `entityDataStore.loadMeta(sport)` only after the tab's `shouldLoad` latched. Two signals + an effect to express "wait for meta before reading names from the store."

Replaced with a sequential await inside `fetchVibe`: meta loads first, vibe fetches second, the resource resolves once both are done. The `names` memo now reads `vibe()` for its reactive dependency — when the resource resolves, the entity-data-store map is guaranteed populated. Net: one fewer signal, one fewer effect, no race window.

`createSignal` and `createEffect` drop out of VibesTab's import list entirely.

## Files Changed

**Deleted**
- `src/lib/utils/autocomplete.ts`
- `src/lib/utils/dom.ts`
- `src/routes/smoke-transition.tsx`

**Modified**
- `src/lib/utils/data-sources.ts` — drop `profileUrl`, `statsUrl`, `twitterSportFeedUrl`, `vibeHistoryUrl`
- `src/lib/utils/stats-categorizer.ts` — gain `normalizePercentiles` export
- `src/components/solid/StatsTab.tsx` — import `entityUrl` directly + `normalizePercentiles` from categorizer; drop local copy
- `src/components/solid/CompareTab.tsx` — import `normalizePercentiles` from categorizer; drop local copy
- `src/components/solid/VibesTab.tsx` — sequential meta-load inside fetcher; drop `metaReady` signal + its effect

## Verification

- `npm run typecheck` — green.
- `npm run build` — green.
  - Server `profile-*.js`: 117.45 → 116.89 KB (-0.56 KB)
  - Server `entry-server.js`: 88.26 → 87.38 KB (-0.88 KB) — dropping the smoke-transition route from the SSR graph.
  - The `smoke-transition-*.js` chunk no longer appears in either client or server output.

LOC delta: ~150 lines deleted across the three removed files plus the four dead exports plus the two duplicated `normalizePercentiles` copies. Plus a small VibesTab simplification.

## Result

Audit findings #10, #11, #15, and the easier half of #14 closed. The codebase has fewer carry-forward stubs to mislead future maintainers, the `data-sources.ts` surface area matches what's actually called, and `lib/utils/dom.ts` (always a misleading name in a no-DOM-manipulation Solid project) is gone entirely.

The harder half of #14 (`categoryToChartStats` dedup) is consciously left in place — the sole-shared-helper refactor would require migrating `PizzaChartStat` into a shared types module to break the util→component import direction, and the audit's own counter-argument applies: two callsites stays under the abstraction threshold.

## Next

Per the audit's queue, what remains:

- **Finding #12 (Medium / M):** add a minimum-viable test surface for pure data utilities (`stats-categorizer`, `co-mentions`, `position-groups`, `player-metrics`, `search-normalize`). Vitest + ~50 fixtures. Highest-leverage data-shape regression coverage.
- **Finding #16 (Low / S):** rename `src/components/solid/` → `src/components/`. Cosmetic. Defer or do.
- **Findings #17–#20:** notes only. No action.

The cutover-blocking work is done. Everything else is week-1 polish.
