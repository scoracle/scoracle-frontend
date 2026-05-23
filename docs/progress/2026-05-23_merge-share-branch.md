# 2026-05-23 — Merge worktree-share-pattern into main

## Goal

Reconcile today's `main` work (Shell padding, butterfly per-entity
scores, CLAUDE.md session-start convention, NFL meta=positional, the
Veil empty card, the "(no mentions found)" note) with today's
share-feature rebuild on `worktree-share-pattern` (6 commits: vertical
5:7 tarot template + new OG composer, dispatch + share-text +
categories + fallback modal, ShareTrigger component, VibeCard adopting
ShareTrigger + ShareButton deletion, StatsCard per-category share,
CompareCard per-category share + compare OG route).

## What Was Done

`git merge worktree-share-pattern --no-ff` into `main`. Three files
had real conflicts:

- **`StatsCard.tsx`** — pure import-block conflict. Both sides added
  imports above the existing block (main: `tierColor`; share branch:
  `ShareTrigger` + `readShareEntity` + `CardType`). Resolution: keep
  all four. The share branch already wired `<ShareTrigger>` into the
  per-slot `For` body, so no body changes needed.
- **`CompareCard.tsx`** — meatier conflict in the per-slot `For` body.
  Main had refactored the iteration to an inline function with
  `primaryScore`/`compareScore` helpers and per-entity Overall score
  readouts (under the butterfly halves and inside the single-PizzaChart
  fallback). The share branch had wrapped the slot's `<Shell>` with a
  `<ShareTrigger>` and emitted a `cardType` of `compare:<categoryId>`
  or `stats:<categoryId>` depending on `hasCompare()`. Resolution:
  combined the inline-function shape from main with the `<ShareTrigger>`
  insertion from the share branch — every category card now shares
  AND shows per-entity scores.
- **`VibeCard.tsx`** — auto-merged cleanly (share branch removed the
  legacy `ShareButton`/share-metadata IIFE and added `<ShareTrigger>`;
  main updated the docstring to mention the Veil). Touched up the
  stale "ShareButton is a sibling component" line in the docstring
  to reference `<ShareTrigger>` + the dispatch flow.

Also auto-merged with no manual work: `Shell.tsx`, share infra in
`src/lib/share/`, OG composer in `src/lib/og/`, and the new
compare-share route.

## Files Changed

29 files (24 from the share branch + 3 resolved conflicts + this
progress doc + a docstring tweak in VibeCard). See
`git show <merge-sha>` for the full list; per-feature progress docs
for the six share commits are already in
`docs/progress/2026-05-23_*.md` (they shipped with the branch).

## Verification

- All conflict markers grepped to zero.
- `npm run typecheck` — clean.
- `npm test` — 131/131 passing (+8 new tests from the share branch's
  `categories.test.ts` and `text.test.ts`).

UI not opened in the browser this commit. Both halves of the merge
were individually validated when they were authored; the conflicts
were structural (where to put new imports / how to nest
`<ShareTrigger>` inside the new inline `For` body), not semantic.

## Result

`main` now carries both today's UX work and the share rebuild — every
Card surface that's shareable (VibeCard, every category card on
StatsCard, every category card on CompareCard) renders via the new
`<ShareTrigger>` → `lib/share/dispatch` → fallback-modal path, while
the per-entity score readouts and Veil empty-state remain intact.
`worktree-share-pattern` is left in place (local + origin) for
reference and possible follow-up work; can be deleted whenever.
