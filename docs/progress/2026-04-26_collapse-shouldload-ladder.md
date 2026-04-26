# Collapse the `shouldLoad` ladder via `createMemo`

**Date:** 2026-04-26
**Scope:** Audit finding #6 (Medium / S). Across-the-board cleanup of the activation latch in tab components.

## Goal

Six tabs (`NewsTab`, `StatsTab`, `XTab`, `VibesTab`, `CoMentionsTab`, `CompareTab`) repeated the same five-line block to gate their fetch on first activation:

```text
const isActive = () => props.active();
const [shouldLoad, setShouldLoad] = createSignal(false);
createEffect(() => {
  if (isActive() && !shouldLoad()) setShouldLoad(true);
});
```

This is a "latch true forever after the tab has been active once" pattern — needed because `createResource` would otherwise re-fetch every time the user clicks back to a tab. The idiomatic Solid one-liner is a memo that carries its previous value, which is exactly what `createMemo`'s prev-arg signature is for. No `createSignal`, no `createEffect`, no signal-set-from-effect anti-pattern.

## What Was Done

Replaced the block in each of the six tabs with:

```text
const shouldLoad = createMemo<boolean>(prev => prev || props.active(), false);
```

Same semantics: starts false, latches true on the first frame `props.active()` returns true, stays true thereafter. The memo recomputes only when `props.active` changes; once it has returned true the result is permanent because `prev || true` short-circuits to `true`.

Net per file: −4 lines, removal of `setShouldLoad` and `isActive` indirection. Where `createSignal`/`createEffect` were only used for this latch (`NewsTab`, `XTab`, `CoMentionsTab`, `CompareTab`), they were dropped from the import lists — `StatsTab` and `VibesTab` keep them for unrelated uses (rate toggle, meta-ready signal).

## Files Changed

**Modified**
- `src/components/solid/NewsTab.tsx`
- `src/components/solid/StatsTab.tsx`
- `src/components/solid/XTab.tsx`
- `src/components/solid/VibesTab.tsx`
- `src/components/solid/CoMentionsTab.tsx`
- `src/components/solid/CompareTab.tsx`
- `docs/progress/2026-04-26_collapse-shouldload-ladder.md`

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. Server `profile-*.js` chunk shrinks 118.28 → 117.60 KB.
- Behavioral equivalence: `prev || props.active()` returns the same monotonic boolean sequence as the old `setShouldLoad(true)` latch. Once true, never returns to false.

## Result

Audit finding #6 closed. The six tabs are 24 fewer lines collectively and one fewer Solid concept (signal-set-from-effect is gone). Fetcher gating is a single declarative one-liner instead of three reactive primitives sharing state.

`createResource(shouldLoad, fetcher)` keeps its existing semantics — fires once when the latch flips true; the source value is then stable, so no spurious refetches on subsequent tab clicks.

## Next

- **Commit D:** medium-severity quick wins — Header anchor `onClick` regression (#7), CompareSearch diacritic normalization (#8), redundant `onMount` in CompareSearch (#9).
- **Commit E:** dead-code purge — `autocomplete.ts`, `escapeHtml`/`showState`/`showWidgetState`, dead URL helpers, `parseEntityParams` (now unused), `smoke-transition` route, `setPageData('widget')` (already gone), VibesTab `metaReady` simplification (#10 + #11 + #15).
- **Commit F:** shared helper extraction — `normalizePercentiles` + `categoryToChartStats` are duplicated between StatsTab and CompareTab (#14).
