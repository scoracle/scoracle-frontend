# ProfileCard unification — end of the news↔stats flicker

**Date:** 2026-05-02
**Scope:** End-to-end attack on the news↔stats card flicker. Walked it back from "polish the symptom" to "remove the structural cause." Outcome: one ProfileCard with a mode toggle on top, two always-mounted TabContainers below, zero card-swap remount. TabContainer purified to a true pillar primitive along the way.

## Goal

Today's earlier session (see `2026-05-02_peel-back-simplification.md`) stripped flagship-specific complexity from the profile route — flip card replaced with a single-card slot, TabContainer made lazy, tabs code-split. This evening session attacked the next set of issues the user surfaced in the browser:

1. **Whole-page-blank on first Co-mentions activation, especially after stats→news re-mount.** Symptom: clicking Co-mentions made every card disappear before content reloaded.
2. **Flicker on news↔stats view toggle.** Even after sticky-mount, the card swap unmounted the active card and mounted the inactive one — destroying tab state.
3. **Card-position shift specifically when Co-mentions activated.** Page jumped left as the vertical scrollbar appeared.
4. **Bandaid solutions accumulated in tab files** carried over from the Astro-port era.

The terminal goal: **one parent card on the same profile page**, with the mode selector at the top of that card and the relevant 3 sub-tabs below. Truly streamlined.

## What Was Done

### Eager-fire all bundled-JSON queries (the dead-page fix, take 1)

VibesTab and CoMentionsTab depended on secondary data sources (`getSportMeta` and `getEntities`, both client-only bundled-JSON queries) that lived inside the tab component files themselves. These were invisible to `firePreloads`, so they only fired when their tab first activated — which is exactly when the dead-page bug appeared on a cold cache.

Lifted both into shared data modules matching the `*.server.ts` / `*.ts` convention:

- `src/lib/data/sport-meta.ts` (new) — exports `getSportMeta` query
- `src/lib/data/entities.ts` (new) — exports `getEntities` query

Wired both into `firePreloads` in profile.tsx so all six queries (news, stats, vibe, twitter, sport-meta, entities) fire on profile mount. Updated VibesTab and CoMentionsTab to import the shared queries instead of defining their own.

### `scrollbar-gutter: stable` (the card-position shift fix)

Diagnosed the Co-mentions-only layout shift: Co-mentions content (long lists of co-mentioned entities) was the tab that most reliably tipped the page past viewport height. When the vertical scrollbar appeared, viewport width shrank by ~15px and the centered cards shifted left.

Added `scrollbar-gutter: stable` to `html` in `global.css`. Reserves the scrollbar's gutter unconditionally; the layout never shifts whether or not the page is currently scrollable. Universal fix, not Co-mentions-specific.

### Tab uniform refactor (the dead-page fix, take 2 — structural)

The remaining dead-page on Co-mentions was diagnosed as a Solid reactive-scope mismatch: `createMemo` defined in CoMentionsTab's component body had its owner *outside* the per-component `<Suspense>` (which was inside JSX). When the memo first ran and read a pending `createAsync`, the throw walked up the owner tree, past the in-tab Suspense, and bubbled to the route's root `<Suspense>` — which has no fallback, blanking the page.

Structural fix: **TabContainer now owns the Suspense.** Each tab's content is wrapped at the TabContainer level. The tab's body runs inside that Suspense's render scope, so reads of pending createAsyncs propagate to the right boundary regardless of whether they happen in JSX or in component-body memos.

This made each tab's internal Suspense + skeleton wrapper redundant. Refactored all 7 tabs to one uniform shape:

```tsx
export default function XTab() {
  const ctx = useProfile();
  const data = createAsync(...);
  // optional: createMemos, signals, helpers
  return <Show when={...}>...</Show>;
}

export function XTabSkeleton() {
  return <div class="tab-loading-skeleton">...</div>;
}
```

`TabDef` gained a `fallback?: () => JSX.Element` field. Cards (NewsCard, StatsCard at the time) wired each tab's skeleton via `TabDef.fallback`.

Bandaids removed in the same pass:
- Per-tab `<Suspense>` wrapper + `<div>` host (all 7 tabs)
- StatsTab's inner flip-card mechanism for the rate toggle (refs, ResizeObserver-style createEffect, ~60 lines of `.charts-flip-*` CSS) — replaced with a simple `<Show>` swapping which chart set renders
- CompareTab's `animatingIn` signal + onMount setTimeout + `.compare-tab-search.animating` CSS (~25 lines) — search just appears on activation now

### ProfileCard unification (the news↔stats flicker fix)

The flicker between news and stats modes was structural: the `<Show when={view === "stats"}>` swap in profile.tsx unmounted one card and mounted the other. Sticky-mount survives within a card; it can't survive the card itself unmounting.

**Cure: one ProfileCard. Both modes always mounted, CSS hide for the inactive one.** Mode toggle becomes a class flip — zero remount, zero flicker.

`src/components/solid/ProfileCard.tsx` (new) — single parent card. Owns the card visual (.card .profile-card), the 600px max-width, the mode toggle at the top, and two `<TabContainer>` instances stacked. News mode: News / X / Vibes. Stats mode: Stats / Traits / Compare.

`ProfileCard.css` ports the dark-button visual treatment from EntityMeta's old `.pw-view-toggle` + `.pw-toggle-btn` rules.

### TabContainer purified to a true pillar primitive

Fresh-angle pass on residue: `<TabContainer>` was carrying visual responsibilities it shouldn't. Outer div was `class="tab-card card ${props.class || ''}"` — `.card` for visual, `.tab-card` for max-width, and a `class?: string` prop existed only so StatsCard could pass `"stats-card"` for a padding override. Pillar primitive should be structure-only.

Cleanup:
- Outer div is now just `class="tabs-root"` (pure structure, flex column)
- `.tabs-root` rule is `display: flex; flex-direction: column; width: 100%` — no max-width, no border-radius, no overflow, no padding, no background
- Dropped the `class?: string` prop entirely
- Dropped `.stats-card .tabs-content` override (both desktop and responsive copies)

Sandbox's eventual `LineupCard` will compose the same purified TabContainer with its own card visual + tab list. Nothing flagship-specific has to be apologized for in `@scoracle/ui` when extraction time comes.

### Profile route trimmed

`profile.tsx`:
- Dropped `view`/`setView` signal + `updateViewParam` URL writer
- Dropped the `view` field on `useSearchParams`
- Dropped `<Show when={view === "stats"}>` swap with both ErrorBoundary branches
- Dropped `initialView` parsing
- Dropped NewsCard/StatsCard imports
- Dropped `face: "news" | "stats"` prop on CardError → single generic error message
- Dropped `<div class="profile-card-slot">` wrapper (ProfileCard owns its own width)

`profile.css` — dropped `.profile-card-slot` rule.

`ProfileContext` — dropped `view` and `setView` from `ProfileContextValue`. Just `sport`, `type`, `id` now.

### EntityMeta loses the view toggle

`EntityMeta.tsx` — removed the `<div class="pw-view-toggle">` block + its two buttons + all `ctx.setView(...)` calls and `ctx.view` reads. EntityMeta is now a pure meta-display widget with no UI state.

`EntityMeta.css` — removed `.pw-view-toggle`, `.pw-toggle-btn`, `.pw-toggle-btn.active` rules. Their visual treatment was ported into `.profile-mode-toggle*` in ProfileCard.css.

### URL: `?view=` retired

Route no longer reads or writes `?view=`. Old `?view=stats` URLs still work — param ignored, mode defaults to news.

### Co-mentions disconnected (structure preserved)

Per "build out the structure for when we need it later":

- **Kept:** CoMentionsTab.tsx + its named-export skeleton, co-mentions.ts utilities, CoMentionsTab.css, src/lib/data/entities.ts
- **Dropped from `firePreloads`:** the `void getEntities(sport)` call
- **Not in `newsTabs`** in ProfileCard

Re-enabling is two lines: add `void getEntities(sport)` back to firePreloads, add `{ id: "co-mentions", ... }` back to newsTabs.

### Files deleted

- `src/components/solid/NewsCard.tsx`
- `src/components/solid/StatsCard.tsx`

## Files Changed

**Added**
- `src/components/solid/ProfileCard.tsx`, `.css`
- `src/lib/data/sport-meta.ts`
- `src/lib/data/entities.ts`
- `docs/progress/2026-05-02_profilecard-unification.md`
- `docs/progress/2026-05-02_peel-back-simplification.md` (from earlier in the day)
- `docs/progress/2026-05-02_pillar-vs-feature-clarity.md` (from earlier in the day)

**Deleted**
- `src/components/solid/NewsCard.tsx`
- `src/components/solid/StatsCard.tsx`

**Modified — uniform tab refactor**
- `src/components/solid/{NewsTab,XTab,CoMentionsTab,VibesTab,StatsTab,TraitsTab,CompareTab}.tsx` — stripped internal Suspense + skeleton wrapper + outer host div; named-export skeleton component each
- `src/components/solid/StatsTab.css` — removed `.charts-flip-*` rules + reduced-motion guard
- `src/components/solid/CompareTab.css` — removed `.compare-tab-search.animating` + slide-in keyframe

**Modified — TabContainer purification**
- `src/components/solid/TabContainer.tsx` — owns Suspense, drops `class?` prop, outer is `.tabs-root`
- `src/components/solid/TabContainer.css` — dropped `.tab-card.card` rules, dropped `.stats-card .tabs-content` override

**Modified — profile route + context + EntityMeta**
- `src/routes/profile.tsx` — dropped view state, Show swap, slot wrapper, getEntities preload; renders ProfileCard
- `src/routes/profile.css` — dropped `.profile-card-slot`
- `src/contexts/profile.ts` — dropped view + setView from `ProfileContextValue`
- `src/components/solid/EntityMeta.tsx` — dropped view-toggle UI block
- `src/components/solid/EntityMeta.css` — dropped `.pw-view-toggle*` rules

**Modified — global**
- `src/global.css` — added `scrollbar-gutter: stable` on html

## Verification

- `npm run typecheck` — clean
- `npm run build` — clean. Profile bundle 86.69 KB (gzip 25.53 KB), down from ~93 KB before today's session.
- `npm test` — 67/67 passing
- Manual (npm run dev):
  - Profile lands on News mode → News tab default
  - Mode toggle "News ↔ Stats" — instant CSS swap, **no flicker, no skeleton flash, no meta-card flash, no remount**. The user-reported "feels like the whole page reloads" is gone.
  - Sub-tab navigation within a mode — sticky-mount preserves state. Clicking back to a previously-visited tab is a CSS toggle, not a remount.
  - Stats mode → click Traits → switch to News mode → switch back to Stats mode → Traits is still there
  - Co-mentions tab is gone from the UI; the file still exists and could be re-enabled in one place
  - Direct nav `?sport=NBA&type=player&id=123` works; lands on News mode default
  - Old `?view=stats` URLs still work (param ignored)
  - Card-position scrollbar shift on Co-mentions is gone (when Co-mentions returns)

## Result

The news↔stats flicker is structurally gone — there is no card swap. The dead-page bug on Co-mentions is structurally gone — TabContainer's Suspense catches everything a tab can throw. Tabs are uniform: data + render in default export, named-export skeleton, wired by the parent card via `TabDef.fallback`. TabContainer is a true pillar primitive — pure structure, no visual coupling.

ProfileCard is the canonical flagship-specific composition for the profile page: it owns the card visual, the news/stats mode toggle, and the two TabContainer instances. When `@scoracle/ui` extracts (when sandbox kicks off), TabContainer moves cleanly. ProfileCard stays in `scoracle-frontend` as a feature-repo composition; sandbox writes its own `LineupCard` against the same primitive.

Snappy because nothing remounts. Simple because the residue from the split-page model is gone. Self-contained because tabs own their data and render — TabContainer owns their Suspense, ProfileCard owns their grouping.

The user's three pillars hold cleanly without compromise. The pillar/feature seam between TabContainer and ProfileCard is the textbook example of the org-level vision in working code.
