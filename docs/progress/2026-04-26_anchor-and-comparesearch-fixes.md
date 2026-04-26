# Header anchor onClick + CompareSearch normalization + redundant onMount

**Date:** 2026-04-26
**Scope:** Audit findings #7 (Medium / S), #8 (Medium / S), #9 (Low / S). Three small fixes that all touch the same theme — Solid-native correctness on small UX details that the Astro port carried forward as imperative shortcuts.

## Goal

Three independent but small wins:

- **#7:** `Header.tsx` had `onClick={() => { window.location.href = '/'; }}` attached to two real `<a href="/">` anchors. The anchor already navigates; the JS handler runs *in addition*, broke Ctrl-click / middle-click "open in new tab" because `window.location.href` always navigates the current tab regardless of modifiers, and was a verbatim port of an Astro-island workaround that doesn't apply here.
- **#8:** `CompareSearch.tsx` filtered candidates with `name.toLowerCase().includes(q)` while `SearchBar.tsx` uses `normalizeForSearch` + the precomputed `_searchIndex` field on each entity. Same UX surface; divergent behavior — "Estêvão" worked in the main bar, "estevao" didn't work in Compare.
- **#9:** `CompareSearch` had both an `onMount` block AND a `createEffect` block both calling `entityDataStore.getEntities(...)` to populate the candidate list. The effect already runs once at setup with initial prop values; the `onMount` was duplicate work (deduplicated by the store's load promise, but still redundant).

## What Was Done

### `src/components/solid/Header.tsx`

- Drop `onClick={() => { window.location.href = '/'; }}` from the menu Home link (line ~104) and the right-edge home button (line ~181). Both are real `<a href="/">` anchors and navigate natively. Modifier-key behavior restored: Ctrl-click and middle-click now open `/` in a new tab, copy-link-address works, etc.

### `src/components/solid/CompareSearch.tsx`

- Import `normalizeForSearch` from `lib/utils/search-normalize`.
- The query is normalized once via `normalizeForSearch(query())` at the top of the suggestions memo.
- Each candidate's haystack uses `item._searchIndex` if present (precomputed in `entityDataStore.fetchEntities` — same field SearchBar uses) or falls back to `normalizeForSearch(item.name)`.
- The internal `fuzzyMatch` helper now normalizes the text via `normalizeForSearch` before tokenizing.
- The redundant `onMount` block is gone. The single `createEffect` block runs once at setup with initial props and reactively re-runs if `sport` / `entityType` / `excludeId` change.

Net behavior: searching "estevao" in Compare now matches "Estêvão". Searching "este wil" matches "Estêvão Willian". Parity with the main `SearchBar`.

## Files Changed

**Modified**
- `src/components/solid/Header.tsx` — drop redundant `onClick` on two anchors
- `src/components/solid/CompareSearch.tsx` — `normalizeForSearch` + `_searchIndex` parity with SearchBar; drop redundant `onMount`
- `docs/progress/2026-04-26_anchor-and-comparesearch-fixes.md`

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. Server `profile-*.js` chunk: 117.60 → 117.45 KB.
- Manual reasoning on the anchor fix: with the onClick removed, the browser handles `<a href="/">` natively for the three relevant input modes (left-click, Ctrl-click, middle-click) — all three now match user expectation.
- The CompareSearch normalization gives parity with the existing SearchBar (which is itself behaviorally tested in production).

## Result

Three findings closed. Header navigation no longer eats modifier keys. The Compare flow's autocomplete now behaves identically to the main search bar for diacritic-bearing names — which is the entire football-name corpus, where the bug mattered most.

The `fuzzyMatch` function still exists in two places (SearchBar + CompareSearch). Per the audit's note #20 and the project's "three similar lines beats premature abstraction" rule, the duplication stays — two callsites is below the abstraction threshold. If a third autocomplete bar appears (e.g., `scoracle-sandbox`), the shared util is the right move at that point.

## Next

- **Commit E:** dead-code purge — `autocomplete.ts`, `escapeHtml`/`showState`/`showWidgetState`, dead URL helpers (`profileUrl`, `vibeHistoryUrl`, `twitterSportFeedUrl`), `parseEntityParams` (now unused after the context refactor), `smoke-transition` route, VibesTab `metaReady` simplification (#10 + #11 + #15).
- **Commit F:** shared helper extraction — `normalizePercentiles` + `categoryToChartStats` are duplicated between StatsTab and CompareTab (#14).
