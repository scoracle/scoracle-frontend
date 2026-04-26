# Profile route context refactor — real SSR shell, hidden-card lazy-load, simpler flip

**Date:** 2026-04-26
**Scope:** Audit findings #1, #2, #4, #5 — the High-severity pillar of the post-audit cleanup. One coherent reactive-flow refactor of the profile route, the cards, and every tab.

## Goal

Take the four entangled findings that all converge on the profile route's state plumbing and resolve them in one atomic change:

- **#1 (High):** restore real SSR for the profile shell. `EntityMeta`, `NewsCard`, `StatsCard` were all wrapped in `clientOnly()` because their leaf descendants read `window.location.search` at component setup. The route already calls `useSearchParams` for the `entityType` discriminator — propagate the rest of the entity params through Solid context, and the `clientOnly` wrappers can go.
- **#2 (High):** stop fetching the hidden card's default tab. Both `NewsTab` and `StatsTab` were firing on every profile mount because each is the default tab in its `TabContainer` and both faces of the flip card mount simultaneously. Gate `isActive` on the visible card.
- **#4 (Medium):** drop the `'profile:viewchange'` CustomEvent bridge. With context, the toggle calls `ctx.setView(...)` directly. Also kill the dead `'profile:setview'` listener (zero dispatchers in the new repo).
- **#5 (Medium):** the imperative `ResizeObserver` in `profile.tsx` was suspending itself during the flip transition for no reason — `rotateY` is a transform on the parent and doesn't change child `scrollHeight`, so the disconnect/reconnect dance was theatre. Collapse to a single observer plus a `createEffect` on `view()`.

## What Was Done

### `src/contexts/profile.ts` — new

Single Solid context exposing entity params (sport, type, id) as captured-once values plus `view`/`setView` for the flip toggle. `useProfile()` throws if called outside the provider so we get a real error instead of a silent `undefined.sport`.

`sport`/`type`/`id` are values, not accessors. The route remounts on cross-entity navigation in practice (`SearchBar` does a hard `window.location.href` swap), so reactive accessors would be future-proofing for a flow that doesn't exist. The `view` accessor is reactive because the toggle flips it during a session.

### `src/routes/profile.tsx` — provider + simpler flip

- Read all four URL params (`sport`/`type`/`id`/`view`) via `useSearchParams` in one place.
- Provide them through `ProfileContext.Provider` wrapping the entire route JSX.
- Drop the `clientOnly()` wrappers on `EntityMeta`, `NewsCard`, `StatsCard` — they're now real imports. SSR renders the full card chrome + skeletons.
- Drop the `'profile:viewchange'` `window.addEventListener` block. The toggle is now a direct `ctx.setView` call from `EntityMeta`.
- Collapse the `ResizeObserver` block from ~50 lines to ~15: one observer always observing both faces; a `createEffect(() => { view(); updateHeight(); })` handles toggle-driven height changes. The `isFlipping` signal, the `transitionend` listener, and the 700 ms safety fallback all delete.
- Drop the `flipInnerRef` ref (no `addEventListener("transitionend")` consumer left).

### `src/components/solid/EntityMeta.tsx` — context consumer, no event bridge

- Replace the `new URLSearchParams(window.location.search)` setup-time read with `useProfile()`.
- Drop the local `activeView` signal — the toggle reads `ctx.view()` directly.
- Drop the `window.dispatchEvent(new CustomEvent('profile:viewchange', ...))` — the toggle calls `ctx.setView(view)` directly.
- Drop the `'profile:setview'` listener (zero dispatchers; pure dead code).
- Drop the `setPageData('widget', ...)` call (zero consumers; verified during the audit). The `$entityInfo` nanostore covers any future need.
- Gate the `createResource` source on `() => !isServer` so the SSR pass renders the loading skeleton and the meta fetch fires after hydration. Removes the previous `clientOnly` reliance for SSR safety.
- Drop the `urlType !== props.type` guard — the prop type is now the context type by construction (no mismatch possible).
- `EntityMeta` no longer takes a `type` prop; reads `ctx.type` instead.

### `src/components/solid/TabContainer.tsx` — `cardActive` gate

Optional `cardActive?: () => boolean` prop. When provided, `isActive` for every tab becomes `cardActive() && activeTab() === tab.id`. Defaults to always-true for any non-flip-card consumer. Two-line addition.

### `src/components/solid/NewsCard.tsx` and `StatsCard.tsx` — context-aware cards

Both cards now read `useProfile()` and pass `cardActive: () => ctx.view() === '<id>'` to their `TabContainer`. `StatsCard` no longer takes an `entityType` prop — it's not needed; the inner tabs read context.

Net: when the user lands on `/profile?...&view=news`, only `NewsTab` fires. The hidden `StatsCard` back face mounts, the `StatsTab` panel renders its skeleton in the DOM, but its `props.active` is false and its `shouldLoad` ladder never latches — so its fetch never fires until the user flips. Lazy-load pillar restored.

### Every tab — context instead of `parseEntityParams()` / `window.location.search`

`NewsTab`, `StatsTab`, `XTab`, `CoMentionsTab`, `VibesTab`, `CompareTab` all swap their setup-time URL reads for `useProfile()`. `StatsTab` and `CompareTab` drop their `type` props (read `ctx.type`). The redundant `if (!shouldLoad())` guards inside fetcher functions are removed where present (`createResource` already gates on the source signal).

`TraitsTab` was already entity-param-free (it consumes the `stats` page-data store). No change here; finding #3 will rework that consumer in the next commit.

## Files Changed

**Added**
- `src/contexts/profile.ts`
- `docs/progress/2026-04-26_profile-context-refactor.md`

**Modified**
- `src/routes/profile.tsx` — provider, drop `clientOnly`, simpler ResizeObserver, no CustomEvent listener
- `src/components/solid/EntityMeta.tsx` — context consumer, SSR-safe resource gate, drop event bridge + dead listener + dead pageData
- `src/components/solid/TabContainer.tsx` — `cardActive` prop
- `src/components/solid/NewsCard.tsx` — read view from context, pass `cardActive`
- `src/components/solid/StatsCard.tsx` — same; drop `entityType` prop
- `src/components/solid/StatsTab.tsx` — context for sport/type/id; drop `type` prop
- `src/components/solid/NewsTab.tsx` — context for sport/type/id
- `src/components/solid/XTab.tsx` — context for sport/type/id
- `src/components/solid/CoMentionsTab.tsx` — context for sport/type/id
- `src/components/solid/VibesTab.tsx` — context for sport/type/id
- `src/components/solid/CompareTab.tsx` — context for sport/type/id; drop `type` prop

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. Client `profile-*.js` chunk ~73 KB (gzip ~22 KB), well under budget. Server `profile-*.js` chunk 121 KB (now SSR-rendering more, naturally larger).
- `npm run dev` + `curl http://[::1]:<port>/profile?sport=NBA&type=player&id=1` returns a real 60 KB SSR HTML body. Grep confirms the SSR shell now contains:
  - The `meta-widget` card with `pw-loading` skeleton
  - The `card-flip-container` + both faces
  - All seven tab panels with their respective loading skeletons (instead of the empty-`clientOnly` shells)
- No `ReferenceError: window is not defined` / `document is not defined` in the dev log.
- Home page (`/`) SSR'd 20 KB without errors.

Manual browser check is the user's job at this point — the live deploy at `https://scoracle-frontend.albapepper.workers.dev` will show the new SSR shape after `npm run cf:deploy`.

## Result

Four findings closed in one coherent change. The profile route is now a Solid-native reactive flow:

- **Real SSR shell.** The card chrome, EntityMeta scaffold, and every tab's loading skeleton render server-side. First paint no longer waits on three dynamic `import()` calls (`clientOnly` is a code-split + dynamic load).
- **Bandwidth honest about the lazy-load pillar.** A user landing on the default News view no longer triggers a stats fetch they may never look at. Same in reverse for users deep-linked to `?view=stats`.
- **No DOM event bridge between sibling islands.** `EntityMeta` and the route share the `view` signal directly; the CustomEvent layer is gone.
- **The flip animation is a CSS transform with a single ResizeObserver next to it.** No imperative coordination between JS and CSS state.

The `~/Scoracle` Astro repo is unchanged — port-source only.

## Next

Per the audit's recommended order:

- **Commit B (next):** finding #3 — replace `pageDataStore` callback queue (`waitForPageData`/`getPageData`/`setPageData`) with the existing `$newsArticles` / `$statsData` / `$tweets` nanostores. `TraitsTab` and `CoMentionsTab` switch to `useStore` + a `createMemo`.
- **Commit C:** medium-severity quick wins — anchor `onClick` regression in `Header.tsx` (#7), `CompareSearch` diacritic normalization (#8), redundant `onMount` (#9).
- **Commit D:** dead-code purge (#10).
- **Commit E:** `shouldLoad` ladder collapse (#6).
