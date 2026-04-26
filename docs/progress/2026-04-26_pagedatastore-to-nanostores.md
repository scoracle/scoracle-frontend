# Replace pageDataStore callback queue with nanostores

**Date:** 2026-04-26
**Scope:** Audit finding #3 (High). Closes the third of three High-severity items identified in the pre-cutover audit.

## Goal

Two parallel cross-island state mechanisms — `pageDataStore` (`waitForPageData` / `getPageData` / `setPageData`) and three nanostores (`$newsArticles`, `$statsData`, `$tweets`) — were publishing the same data twice. The nanostores are the idiomatic Solid primitive and were already wired; the `pageDataStore` was Astro-era plumbing that should have retired.

This commit retires it. Consumers (`TraitsTab`, `CoMentionsTab`) switch to `useStore(...)` + a reactive `createMemo`. Publishers (`NewsTab`, `StatsTab`, `XTab`) drop their `setPageData(...)` mirror writes. The `pageDataStore` infrastructure is deleted from `api-fetcher.ts` along with the only function that consumed it externally (`fetchTwitterStatus` — which had zero importers, so dead in tandem).

## What Was Done

### `src/stores/news.ts` — type widened to `NewsArticle[] | null`

Initial value flips from `[]` to `null`. Lets consumers distinguish "still fetching" (null) from "fetched, no results" (`[]`). The previous `[]`-initialized store conflated those two states, which is what made `waitForPageData` necessary in the first place — `setPageData` was the explicit "now I have data" signal.

### `src/components/solid/NewsTab.tsx` — always publishes (even empty arrays)

Drops the `if (a && a.length > 0)` guard that previously withheld empty results from the store. Now publishes whenever the resource resolves (including `[]`). Drops the `setPageData('news', ...)` mirror.

### `src/components/solid/StatsTab.tsx` — drops `setPageData` mirror

Already publishes to `$statsData` on resolution. Single source of truth.

### `src/components/solid/XTab.tsx` — drops `setPageData` mirror

Already publishes to `$tweets`. Same.

### `src/components/solid/TraitsTab.tsx` — pure derivation from `$statsData`

Rewritten from `createResource(shouldLoad, fetchTraits)` (which awaited `waitForPageData`) to:

```text
const stats = useStore($statsData);
const traits = createMemo(() => extract(stats()) ?? null);
```

The `props.active` prop becomes unused — TraitsTab has no fetch of its own to lazy-load, just a derivation. As a side effect, when StatsTab's SWR cache revalidates 30 minutes later, the trait list now updates live (the old `waitForPageData` resolved once and never updated). The skeleton is rendered while `traits()` is null.

### `src/components/solid/CoMentionsTab.tsx` — reactive multi-source derivation

Subscribes to `$newsArticles` and `$tweets` directly. One-shot `createResource` for `loadEntitiesForSport(sport)` (the only async dependency, gated on `shouldLoad`). A `createMemo` combines all three.

Loading vs empty states are now distinguishable: `news() === null` (NewsTab still fetching) → loading skeleton; `result() === null` after both are loaded → "no co-mentions found" empty state. Previously this distinction was absent — an entity with genuinely zero news would hang on the 3-second `waitForPageData` timeout before showing the empty state.

### `src/lib/utils/api-fetcher.ts` — pageDataStore removed

Deleted: `pageDataStore`, `pageDataCallbacks`, `setPageData`, `getPageData`, `waitForPageData`, `clearPageData`, `PageData` interface, `TwitterStatus` interface, `fetchTwitterStatus`. The latter four were tightly coupled to `pageDataStore` and had zero external consumers (`fetchTwitterStatus` was never imported; XTab calls `swrFetch(twitterStatusUrl().url)` directly). They go in the same commit since they form a coherent dead-code island once the pageDataStore is gone.

Net: `api-fetcher.ts` shrinks from 332 lines to ~210, and the module's purpose narrows to exactly what its name promises — the SWR fetcher and its cache.

Also added a header comment documenting that the SWR cache is module-singleton and client-only by design (per audit finding #13's note about server-side leak risk if anyone moves a fetch into a server loader).

## Files Changed

**Modified**
- `src/lib/utils/api-fetcher.ts` — pageDataStore + fetchTwitterStatus deleted; client-only header comment added
- `src/stores/news.ts` — type widened to `NewsArticle[] | null`, initial `null`; comment trimmed
- `src/stores/stats.ts` — comment trimmed (no behavior change)
- `src/components/solid/NewsTab.tsx` — drop setPageData mirror; always publish to $newsArticles
- `src/components/solid/StatsTab.tsx` — drop setPageData mirror
- `src/components/solid/XTab.tsx` — drop setPageData mirror
- `src/components/solid/TraitsTab.tsx` — replace createResource + waitForPageData with useStore + createMemo
- `src/components/solid/CoMentionsTab.tsx` — replace waitForPageData with useStore + createResource(entities) + createMemo
- `docs/progress/2026-04-26_pagedatastore-to-nanostores.md`

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. Server `profile-*.js` chunk shrinks 121.22 → 118.28 KB (≈ 2.9 KB saved).
- `npm run dev` + `curl http://[::1]:<port>/profile?sport=NBA&type=player&id=1` returns clean SSR HTML with all skeletons (meta-widget, sw-loading, tab-loading-skeleton, chart-skeleton). No `ReferenceError` in dev log.
- TraitsTab now SSRs its skeleton (the `sw-loading` shape) where previously the createResource'd version SSR'd as empty (because `shouldLoad` was false on SSR and the resource was unresolved). Net: more visible above-the-fold scaffolding for free.

## Result

Three High-severity findings from the audit are now closed (#1 + #2 + #4 + #5 in the previous commit; #3 here). The cross-island state surface is one mechanism — Solid signals via nanostores — instead of two:

- **Live revalidation works.** When SWR refreshes news or stats 5 / 30 minutes later, dependent tabs (TraitsTab, CoMentionsTab) re-derive automatically. Previously these resolved once via `waitForPageData` and then stayed frozen.
- **Loading states are honest.** Empty news and "still fetching" news are no longer the same value. Users with entities that have no recent coverage see the empty state immediately instead of a 3-second skeleton followed by the empty state.
- **One concept, not two.** Future maintainers don't have to learn `setPageData` *and* nanostores — just nanostores.

`api-fetcher.ts` becomes the focused SWR module its name suggests; `setPageData('widget')` and the dead `fetchTwitterStatus` are off the audit checklist.

## Next

- **Commit C:** medium-severity quick wins — Header anchor `onClick` regression (#7), CompareSearch diacritic normalization + redundant `onMount` (#8 + #9).
- **Commit D:** dead-code purge — `autocomplete.ts`, `escapeHtml`/`showState`/`showWidgetState`, dead URL helpers, `smoke-transition` route, `parseEntityParams` (now unused after the context refactor) (#10 + #11).
- **Commit E:** `shouldLoad` ladder collapse via `createMemo` (#6).
