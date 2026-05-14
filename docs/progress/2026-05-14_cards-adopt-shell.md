# 2026-05-14 — Cards adopt Shell + ContentShell goes borderless

## Goal

Land the second commit of the **Shell-as-vessel** refactor: every Card wraps
its body in a `<Shell>`, ContentShell becomes a borderless layout container,
and shareable Cards (Vibes / Stats / Compare) hand a single `share` metadata
object to Shell — no Card touches `ShareButton`, `ShareModal`, `ShareFrame`,
`Portal`, `html-to-image`, or `buildShareUrl` anymore.

## What Was Done

### Cards rewritten to wrap their bodies in `<Shell>`

- **`VibeCard.tsx`** — wraps in `<Shell template="standard" cornerLabel={archetype()?.numeral} share={…}>`.
  Drops the `vibe-card-wrapper` div, the `vibe-share-btn` slot, the
  `useShell()` corner-label publish + `onCleanup`, and every share import
  (`ShareButton`, `ShareFrame`, `Portal`, `toBlob`, `buildShareUrl`,
  `sharePreview`). Hoists the local `readShareEntity` helper to
  `src/lib/utils/share-entity.ts`.
- **`StatsCard.tsx`** — wraps in `<Shell template="dynamic" share={…}>`.
  Transient — will be retired in Phase D when Stats splits into four
  category cards (Attack / Possession / Defense / Discipline). Each
  category will then be its own `<Shell template="standard" share={…}>`.
- **`CompareCard.tsx`** — wraps in `<Shell template="dynamic" share={…}>`
  with `share.secondary` populated whenever `compared()` is truthy. The
  dual-meta header band gets wired through Commit C; Commit B just gets
  the data flowing.
- **`TraitsCard.tsx`** — wraps in `<Shell template="dynamic">` (no
  share). Locked to dynamic because the list isn't a single artifact.
- **`ArticlesCard.tsx`**, **`XCard.tsx`** — wrap in
  `<Shell template="dynamic">` (no share). Empty-state remains
  `<EmptyCard />` outside Shell — EmptyCard now provides its own
  standard-template Shell, matching VibeCard's silhouette.
- **`EmptyCard.tsx`** — now wraps itself in `<Shell template="standard">`.
  Every News-mode null state speaks the same tarot silhouette.

### Skeletons match resolved chrome

Every `*CardSkeleton` named export wraps its loading body in the same
Shell template as its resolved Card — no chrome blink at Suspense
resolution.

### ContentShell goes borderless

- Drops the outer `<Shell>` that previously wrapped both NavTabs strips
  and the active pane in one card.
- New shape: a plain `<section class="content-shell">` that stacks
  - a dynamic-template `<Shell>` holding both NavTabs strips, and
  - the active Card's own Shell (sticky-mounted per-pane).
- CSS rewritten: drops `padding: 24px` and the `.content-shell.card`
  selector; adds `.profile-nav-shell { padding: 0.75rem 1rem }` for
  nav breathing room.
- Sticky-mount preserved via `<For each={PANES}>` over `(mode, sub-tab)`
  keys.

### Other Shell-adoption tweaks

- **`EntityMeta.tsx`** — explicit `template="standard"` on its existing
  Shell. `useShell()` publish of entity ID stays — it's the canonical
  example of the runtime-published cornerLabel pattern.
- **`routes/index.tsx`** — explicit `template="dynamic"` on the
  home-search Shell.

### Shared util

- **`src/lib/utils/share-entity.ts`** (NEW) — hoists `readShareEntity`
  out of VibeCard so CompareCard can read both primary and secondary
  entity meta from the same source. Sync entity-meta lookup via
  `entityDataStore` — no async, query() dedupe is irrelevant.

### Vocabulary sync

- **`~/scoracleWiki/wiki/Architecture/Component Hierarchy.md`** —
  rewrites rule 0 ("Shell is the vessel; cards live inside their own
  Shell") and rule 3 ("Shareability is a single `share` prop on
  Shell"); updates the profile-page diagram to show the borderless
  ContentShell stacking per-Card Shells; updates the file table to
  reflect the new wrap-in-Shell pattern; flags ShareFrame /
  ShareButton / ShareModal as internal-to-Shell modules.
- **`CLAUDE.md`** — updated "Profile page architecture" + "Card
  convention" sections to match. New Card-shape snippet shows the
  set-and-forget pattern; documents the body-idempotence requirement
  when `share` is supplied (Shell renders children twice — once
  in-app, once in the modal preview).

## Files Changed

```
src/components/solid/ArticlesCard.tsx
src/components/solid/CompareCard.tsx
src/components/solid/ContentShell.css
src/components/solid/ContentShell.tsx
src/components/solid/EmptyCard.tsx
src/components/solid/EntityMeta.tsx
src/components/solid/StatsCard.tsx
src/components/solid/TraitsCard.tsx
src/components/solid/VibeCard.css
src/components/solid/VibeCard.tsx
src/components/solid/XCard.tsx
src/routes/index.tsx
src/lib/utils/share-entity.ts                 (NEW)
CLAUDE.md
docs/progress/2026-05-14_cards-adopt-shell.md (this doc, NEW)
~/scoracleWiki/wiki/Architecture/Component Hierarchy.md
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 passing.
- SSR smoke-check across HOME + 5 profile sub-tabs (VIBES, STATS,
  COMPARE, X, TRAITS) — all returned 200.

After commit, manual:

- `pkill -f vite && npm run dev`, hard-reload, click-through each
  profile sub-tab. Verify share modals open from Vibes / Stats /
  Compare; confirm Compare with a selected comparison shows dual-meta
  (still single-meta until Commit C wires `secondaryEntity` into the
  ShareFrame header — data flow is in place).
- Confirm chrome continuity at Suspense resolution (no card outline
  blink as the skeleton swaps in the resolved Card).

## Result

Card files now import only `<Shell>` from the vessel layer — Share
infrastructure has fully receded behind Shell's API. Adding a new
shareable Card is: write the body, write the `share` metadata, hand
both to Shell. ContentShell stops being a card and is now what its
name implies — a layout container that holds cards.

Commit C is next: slim ShareFrame to a band wrapper (no `.card`
chrome of its own), wire `secondaryEntity` into the header so
Compare's dual-meta renders in the share artifact, and decide whether
to fold ShareButton / ShareModal into `Shell.tsx` proper or leave
them as separate files behind Shell-only imports.
