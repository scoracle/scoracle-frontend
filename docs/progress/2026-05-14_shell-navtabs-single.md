# 2026-05-14 — Shell single-shape + NavTabs single-variant

## Goal

Peel back the structural complexity that had accreted on the two
platform primitives. Shell loses its two-template split (`standard`
/ `dynamic`) for a single locked 380×320 landscape shape with one
boolean opt-out (`unlockHeight`). NavTabs loses its three variants
(`primary` / `feature` / `sub`) for one look used on every surface.
The platform now has one frame, one nav, one shape — set-and-forget
foundation for cross-site reuse.

## What Was Done

### Shell collapses to one shape

`src/components/solid/Shell.tsx`:

- Drops `template?: "standard" | "dynamic"` and the
  `ShellTemplate` type export.
- Adds `unlockHeight?: boolean`. Default false → locked 380×320.
- Root class becomes
  `\`shell card${unlockHeight ? " shell-unlocked" : ""}\``.
- The internal `<ShareFrame>` call drops `template`. The recursive
  inner `<Shell>` in the share preview drops `template` too, so the
  preview is locked-by-default — matches in-app silhouette
  byte-identically.
- JSDoc rewritten to describe the single-shape + opt-out model.

`src/global.css`:

```css
.shell {
  width: 100%;
  max-width: 380px;
  aspect-ratio: 380 / 320;
  margin-inline: auto;
}

.shell.shell-unlocked {
  aspect-ratio: auto;
  max-width: none;
}
```

`src/components/solid/ShareFrame.tsx` + `ShareFrame.css`:

- Drops `template: ShellTemplate` prop and the
  `ShellTemplate` type import.
- Root class becomes plain `share-frame` (no per-template suffix).
- CSS folds `max-width: 380px; margin-inline: auto` into the base
  rule; drops the standard/dynamic conditional blocks.

`src/components/solid/VibeCard.css`:

- Drops `min-height: 320px` from `.vibe-card`. Shell owns the
  locked height via aspect-ratio.

### NavTabs collapses to one variant

`src/components/solid/NavTabs.tsx`:

- Drops the `variant` prop and the `NavTabsVariant` type export.
- Root class becomes plain `nav-tabs` (no per-variant suffix).

`src/components/solid/NavTabs.css`:

- Single rule set under `.nav-tabs` + `.nav-tabs-btn`. Uses today's
  `feature` rules verbatim as the base: `gap: 0.25rem`,
  `width: min(80%, 480px)`, `margin: 0 auto`, button
  `flex: 1 1 0; min-height: 48px; padding: 0.875rem 0.5rem;
  font-size: 0.8rem; letter-spacing: 0.12em`.
- Drops `.nav-tabs-primary`, `.nav-tabs-feature`,
  `.nav-tabs-sub` blocks entirely.
- Responsive `@media (max-width: 480px)` block rescoped from
  `.nav-tabs-feature` to `.nav-tabs`.

### Callers migrated

- `ContentShell.tsx` — nav Shell drops `template="dynamic"` →
  `unlockHeight`; NavTabs drops `variant="feature"`.
- `ContentShell.css` — `.content-shell` gets
  `align-items: center` so locked-shape Shells (VibeCard,
  EmptyCard, MetaShell) center beneath the unlocked nav strip.
  `.content-shell-panes` and `.content-shell-pane` also center
  their contents.
- `EntityMeta.tsx` — drops `template="standard"`.
- `EmptyCard.tsx` — drops `template="standard"`.
- `VibeCard.tsx` — drops `template="standard"` on Card +
  Skeleton; JSDoc updated.
- `ArticlesCard.tsx`, `XCard.tsx`, `TraitsCard.tsx` — Card +
  Skeleton drop `template="dynamic"` → `unlockHeight`.
- `StatsCard.tsx` — Card + Skeleton flip to `unlockHeight`.
  **Drops the entire `share={…}` block** plus the now-unused
  `readShareEntity` import and the `entity` createMemo.
- `CompareCard.tsx` — same: Card + Skeleton to `unlockHeight`,
  drops the `share={…}` block, drops `readShareEntity`,
  `primaryEntity`, and `secondaryEntity` memos.
- `routes/index.tsx` — home search Shell flips to
  `unlockHeight`; NavTabs drops `variant="feature"`.

### Vocabulary sync

- `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md`:
  Shell description updated to "one canonical shape, one boolean
  opt-out." Profile-page diagram redrawn with the flat single
  NavTabs strip. Share-table rewritten: only VibeCard is
  shareable today; Stats/Compare transient pending Phase D.
  File table updated.
- `CLAUDE.md`: Profile-page section updated to single `activeTab`
  signal + flat 6-sibling nav. Card-convention snippet rewritten
  using `unlockHeight` + the simpler `<Shell>` (no `template`).

## Files Changed

```
src/components/solid/Shell.tsx
src/global.css
src/components/solid/ShareFrame.tsx
src/components/solid/ShareFrame.css
src/components/solid/NavTabs.tsx
src/components/solid/NavTabs.css
src/components/solid/ContentShell.tsx
src/components/solid/ContentShell.css
src/components/solid/EntityMeta.tsx
src/components/solid/EmptyCard.tsx
src/components/solid/VibeCard.tsx
src/components/solid/VibeCard.css
src/components/solid/ArticlesCard.tsx
src/components/solid/XCard.tsx
src/components/solid/TraitsCard.tsx
src/components/solid/StatsCard.tsx
src/components/solid/CompareCard.tsx
src/routes/index.tsx
CLAUDE.md
~/scoracleWiki/wiki/Architecture/Component Hierarchy.md
docs/progress/2026-05-14_shell-navtabs-single.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `npm run dev` + SSR smoke across `/`, `/profile`, and all six
  `?tab=` values — all 200.
- No errors / warnings in the dev log (just the benign workerd
  `--localstorage-file` notice).

After commit, manual:

- Profile page renders a single 6-sibling nav strip with the
  unified gapped-bounded look. VibeCard sits as a locked 380×320
  landscape card beneath it.
- News, X, Traits, Stats, Compare cards render at full row width
  with content-driven height.
- Home page sports row unchanged visually.
- Share modal: only the Vibes card shows a share button. Click →
  modal preview renders a locked 380×320 inner Shell inside the
  ShareFrame band stack, byte-identical to the in-app card.
- DevTools Performance "Layout Shifts" → CLS = 0 on tab switches.

## Result

The platform has one frame and one nav. New cards drop into Shell;
new destinations append to NavTabs. The foundation is now stable
enough to carry sandbox / fantasy / stats / ai without growing
more knobs. Phase D (StatsCard + CompareCard split into per-
category children) is a straight feature add — no platform
primitive change required.
