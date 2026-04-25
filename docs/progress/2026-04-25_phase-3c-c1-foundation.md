# Phase 3c, Commit 1 — TabContainer + content-tabs + EntityMeta foundation

**Date:** 2026-04-25
**Scope:** Land the components that the rest of Phase 3c builds on. No route consumes them yet — pure tree-add. Typecheck-clean, no behavior change in browser.

## Goal

Phase 3c is the heaviest port — 13 component files plus the profile-route shell with its flip-card + URL-param logic. Splitting it into eight commits to keep each one verifiable and reviewable.

This first commit lands the foundation:

- **`TabContainer`** — the generic signal-driven tab system used by both `NewsCard` and `StatsCard`. Pure pattern, no SSR concerns.
- **`content-tabs.css`** — shared loading-skeleton / empty-state styles consumed by every tab content component (News, Co-Mentions, Traits, etc.).
- **`EntityMeta`** — the unified player/team meta card at the top of the profile page. Hydrates from local `entityDataStore`, publishes to `$entityInfo` and `setPageData('widget')`, owns the News ↔ Stats view toggle. The most complex of the three.

## What Was Done

### `src/components/solid/TabContainer.tsx` + `.css`
Verbatim port; `@jsxImportSource` directive removed (per the Phase 3b convention). 56 LOC of TSX. The interface stays clean:

```ts
export interface TabDef {
  id: string;
  label: string;
  /** Factory receives a reactive isActive accessor — called once at mount */
  content: (isActive: () => boolean) => JSX.Element;
}
```

Lazy-loading discipline lives in the `isActive` render prop — tabs only fetch data when their `isActive()` becomes true for the first time.

### `src/components/solid/content-tabs.css`
Verbatim port. Skeleton pulse animation + empty-state styles, shared across all tab content components.

### `src/components/solid/EntityMeta.tsx` + `.css`
Verbatim port; `@jsxImportSource` directive removed. **One SSR concern flagged in a docstring:**

```ts
// SSR note: this component reads `window.location.search` at setup, so
// it must be consumed via `clientOnly` from `@solidjs/start`. The route
// is responsible for the wrapper. See routes/profile.tsx.
```

The component reads URL params at the top of its setup function:

```ts
const params = new URLSearchParams(window.location.search);
```

That would crash SSR. Following the Phase 3b CrystalBall pattern, the consumer (`routes/profile.tsx` in C7) wraps it via `clientOnly()` to skip SSR. Two reasons to take that approach over refactoring to `useSearchParams`:

1. **Consistency with CrystalBall.** Both components read URL params at setup; same pattern keeps the codebase legible.
2. **EntityMeta is data-driven and feel-driven, not SEO-driven.** Even if SSR worked, the component would render an empty skeleton until the bundled JSON loads. CSR with skeleton-first is fine here.

If a future entity profile needs to be SEO-indexed (e.g., pre-rendering `/profile?sport=NBA&type=player&id=237` for crawlers), revisit and switch to `useSearchParams` — but that's a deployment concern, not a render concern.

### Other things ported as-is

- `setPageData('widget', { entity_id, entity_type, sport, info })` — consumed by `XTab` (lands in C3) for entity-name resolution. `setPageData` already in the tree from Phase 3a.
- `setEntityInfo({ sport, type, id, name, position, positionGroup })` — publishes to `$entityInfo` nanostore. Consumed by future tabs that need entity context.
- Custom-event bridge — `window.dispatchEvent(new CustomEvent('profile:viewchange', { detail: { view } }))` and `window.addEventListener('profile:setview', ...)`. The route (C7) handles these; `onCleanup` is registered inside `onMount` so it never fires on the server. Consistent with the Phase 3b SSR pattern.

## Files Changed

Added (5):
- `src/components/solid/TabContainer.tsx`
- `src/components/solid/TabContainer.css`
- `src/components/solid/content-tabs.css`
- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/EntityMeta.css`
- `docs/progress/2026-04-25_phase-3c-c1-foundation.md` (this file)

## Verification

- `npm run typecheck` → clean.
- `vite dev` → boots in ~250 ms.
- All four existing routes still serve unchanged (no new imports yet):
  - `/` → 200, 17887 bytes
  - `/profile` → 200, 16939 bytes
  - `/terms` → 200, 17050 bytes
  - `/no-such-route` → 200, 16945 bytes
- No new warnings or errors in dev log.

## Result

The Phase 3c foundation is in place. EntityMeta and TabContainer compile against the Phase 3a plumbing (entityDataStore, setPageData, setEntityInfo, $entityInfo, position-groups, player-metrics) without code changes — those utilities ported correctly in 3a.

Next: **C2 — NewsCard shell + NewsTab + CoMentionsTab.** The card-front composition. Then VibesTab + XTab in C3.
