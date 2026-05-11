# Three-Shell stack — TabShell extracted, ContentShell pure-content

**Date:** 2026-05-10
**Scope:** Refactors the profile page into a three-Shell stack (MetaShell → TabShell → ContentShell). Tab navigation extracted out of ContentShell into a new dedicated `TabShell` component; tab state lifted to `ProfileContext` so TabShell writes and ContentShell reads. `ProfileCard` renamed to `ContentShell` and stripped of mode-toggle / sub-tab nav UI — it's now a pure host for the active Card.

## Goal

User feedback after seeing the v2 chrome iterate to its final polish:

> The new tab structure should be a tab shell with the tab tab in it (to select between news and stats), and then the child tab below that. The cards will be in the content card shell.

The current ProfileCard mixed two concerns — tab navigation AND content rendering — inside one Shell. Splitting them earns:

- **Three clean Shells**, each with one job. MetaShell = identity. TabShell = navigation. ContentShell = active card.
- **Stronger card metaphor.** Three card-shaped surfaces visibly stacked, mirroring the *cards laid out on a table* mental model the v2 chrome already conveys.
- **Cleaner share affordance** later. Cards are leaves inside ContentShell with no tab UI competing for attention; the share button on a Card has visual room to breathe.
- **A reusable `TabShell` primitive.** Sandbox / fantasy / stats sites can compose their own tab structures with the same Shell + Tab pattern.

## What Was Done

### 1. ProfileContext extended with tab state

`src/contexts/profile.ts`:

- New types: `ProfileMode = "news" | "stats"`, `NewsSubTab = "news" | "x" | "vibes"`, `StatsSubTab = "stats" | "traits" | "compare"`.
- `ProfileContextValue` extended with `mode` / `setMode`, `newsSubTab` / `setNewsSubTab`, `statsSubTab` / `setStatsSubTab` accessor + setter pairs.

Existing consumers (NewsTab, VibeCard, etc.) read sport/type/id from the context as before — unaffected by the new fields. The new fields are used by TabShell (writer) and ContentShell (reader).

### 2. New `<TabShell>` component

`src/components/solid/TabShell.tsx` + `.css`.

Pure navigation. Two stacked tab rows:

```
┌────────────────────────────────────────┐
│        NEWS       │       STATS        │   ← parent Tab — split-fill toggle
│                                        │
│       NEWS    X    VIBES               │   ← child Tab — News mode
│   (or  STATS  TRAITS  COMPARE  for     │       Stats mode)
└────────────────────────────────────────┘
```

- Reads + writes tab state via `useProfile()` context.
- Card chrome via the global `.card` class — same Bone surface, Soft sand inset stroke, paper-on-desk shadow as MetaShell + ContentShell.
- 10px padding so content sits inside the inset stroke (matches ContentShell's pattern).
- No corner numerals (TabShell has no single identifier the way MetaShell has entity ID and VibeCard has archetype Roman numeral — the *chrome reveals data* rule means nothing on TabShell since it's pure nav).
- No share button. TabShell is a Shell, not a Card; the Card-default-shareable rule doesn't apply.
- Parent buttons use the same dark-fill-on-active pattern previously in ProfileCard; child buttons match the previous TabContainer's tab-btn styling.

### 3. `ProfileCard` renamed to `ContentShell` + nav stripped

`git mv src/components/solid/ProfileCard.{tsx,css} ContentShell.{tsx,css}` + body refactor:

- No mode toggle, no `<TabContainer>` instances. Just six pane wrappers (one per `mode:tab` combination), with the active one CSS-shown and the rest hidden.
- **Sticky-mount preserved**: `[mounted, setMounted]` signal tracks which `mode:tab` keys have ever been activated. A `createEffect` watches `activeKey()` and adds it to the set. A pane only enters the DOM after first activation; once mounted, it stays. CSS hides inactive panes. Switching back is instant — no remount, no Suspense fallback flash.
- Each active pane wrapped in `<Suspense fallback={...}>` — preserves the per-pane streaming behavior the previous `<TabContainer>` provided.
- Six tabs total: `news:news`, `news:x`, `news:vibes`, `stats:stats`, `stats:traits`, `stats:compare`. Each uses the existing tab body components + their `*Skeleton` exports.

CSS dropped: `.profile-mode-toggle`, `.profile-mode-btn`, `.profile-mode-btn:hover`, `.profile-mode-btn.active`, `.profile-mode-pane.hidden`. New: `.content-shell` + `.content-shell-pane` + `.content-shell-pane.active`.

### 4. Profile route wires the three-Shell stack

`src/routes/profile.tsx`:

- `ProfileBody` instantiates the three tab signals (`mode`, `newsSubTab`, `statsSubTab`) using `createSignal`.
- `ProfileContextValue` populated with sport/type/id + the three signal accessor/setter pairs.
- Renders `<EntityMeta />` (MetaShell, still wrapped in `clientOnly()`), `<TabShell />`, and `<ContentShell />` (wrapped in the existing `<ErrorBoundary>`).
- Old import of `ProfileCard` removed; new imports of `TabShell` + `ContentShell` added.
- Doc comment updated to describe the three-Shell layout and tab-state-via-context flow.

### 5. Comment refs updated

- `src/global.css` — `.card` rule's docblock updated to list MetaShell + TabShell + ContentShell as consumers (was MetaShell + ProfileCard).
- `src/routes/profile.css` — top comment updated for the three-Shell layout.
- `src/components/solid/EntityMeta.tsx` — docblock updated; describes EntityMeta as the MetaShell of the three-Shell stack and points at TabShell for tab navigation (was "the news/stats mode toggle now lives at the top of ProfileCard").

## Files Changed

**Added:**
- `src/components/solid/TabShell.tsx`
- `src/components/solid/TabShell.css`

**Renamed:**
- `src/components/solid/ProfileCard.tsx` → `src/components/solid/ContentShell.tsx`
- `src/components/solid/ProfileCard.css` → `src/components/solid/ContentShell.css`

**Modified:**
- `src/contexts/profile.ts` — tab state types + signals on `ProfileContextValue`
- `src/components/solid/ContentShell.tsx` — full rewrite (pure-content host; sticky-mount panes via signal-tracked activated set; reads tab state from context)
- `src/components/solid/ContentShell.css` — full rewrite (drops mode-toggle styles; minimal `.content-shell` + `.content-shell-pane` rules)
- `src/routes/profile.tsx` — instantiates tab signals, populates ProfileContext, renders the three-Shell stack
- `src/global.css` — `.card` docblock comment updated
- `src/routes/profile.css` — header comment updated
- `src/components/solid/EntityMeta.tsx` — docblock comment updated

**Vault:**
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-10_three-shell-stack-tabshell-extracted.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row
- `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md` — TabShell added to the structure diagram + a new sub-section codifying the three-Shell pattern (companion vault edit)
- `~/.claude/.../memory/project_aesthetic_v2.md` — three-Shell pattern persisted across sessions

## Verification

```bash
cd ~/scoracle-frontend
npx tsc --noEmit       # passes
npx vitest run         # 92 tests pass
```

Browser-side smoke after dev reload:
- Three card-shaped surfaces stacked vertically: entity-meta on top, tab-nav in the middle, active-card at the bottom.
- Each Shell has the v2 chrome — Bone surface, 6px rounded outer, Soft sand inset stroke, paper-on-desk shadow.
- Click parent tab (News ↔ Stats) — child tab row swaps, ContentShell swaps to first child of the new mode.
- Click child tab — ContentShell pane swaps. First click on a pane mounts it; subsequent clicks switch CSS-instantly (sticky-mount).
- Cross-entity navigation via SearchBar still hard-reloads as before; ProfileBody remounts cleanly with default tab state (News / news).

## Result

Phase 4-adjacent structural cleanup. The profile page now reads as a three-card tarot reading visually: top card = identity, middle card = navigation, bottom card = the draw. Each Shell is clean and focused. Tab state is centralized in ProfileContext where future surfaces (e.g., a "Today's Draws" feed surface, a comparison route) can subscribe.

The new architecture also unblocks the parked flip animation work (Commit 3 of the original three-commit plan) — when we want to bring it back, ContentShell is the natural home for a CSS 3D flip on parent-mode change, since it owns no tab UI to coordinate with. That's a separate follow-up whenever the user wants it.

## Implications + carry-forwards

- **TabShell is a `@scoracle/ui` candidate.** When the second product (sandbox) needs tab navigation, TabShell extracts cleanly — it has no flagship-specific imports beyond the ProfileContext type names. Sandbox would parametrize the parent + child tab labels via props.
- **`<TabContainer>` primitive is now unused** in the flagship's profile route. It still lives in `src/components/solid/TabContainer.tsx` — keeping it for sandbox / fantasy / future surfaces that might want a different tab pattern. Could be removed if it stays unused; for now, low cost to leave.
- **Tab state surviving cross-entity navigation:** currently doesn't (the route remounts on entity change via `<Show keyed>`). If users want persistent tab preference across entity switches, we'd add localStorage backing on the signal setters. Out of scope for this commit; flag if it comes up.
- **Flip animation (Commit 3 of the original plan)** is parked — user explicitly said "Once we iron out the new look, we can work on the flip." The structural foundation for it is now in place: ContentShell is the right home; mode change is the right trigger; existing CSS conventions support `transform: rotateY(180deg)` cleanly.
- **Default tab is hard-coded to News / news.** Could be config-driven later (URL param, localStorage, or a per-user preference). Out of scope.

## Related

- `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md` — Shell → Tab → Card vocabulary; three-Shell pattern lock
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — locked card silhouette + chrome that all three Shells share
- `~/scoracle-frontend/docs/progress/2026-05-10_phase-4a-share-frame-vibecard.md` — Phase 4a ShareFrame, shipped earlier today
- `~/scoracle-frontend/docs/progress/2026-05-02_profilecard-unification.md` — original ProfileCard unification (the surface this refactor splits back apart, with a different rationale + cleaner split-line)
