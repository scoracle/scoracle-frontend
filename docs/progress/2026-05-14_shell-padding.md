# 2026-05-14 — Uniform Shell padding + home-shell flex layout

## Goal

Three padding-related complaints after the Shell-dimensions land:

1. Home-search-shell's NavTabs strip overlapped the Shell border
   because the legacy `.home-search-shell .sport-tabs` absolute-
   positioning rule targeted a dead class (`sport-tabs`) and the new
   `.nav-tabs` fell out of any positioning rule — sitting full-width
   inside an unpadded Shell.
2. Articles and X cards had list-item text butting against the Shell
   border because the Shell carried no internal padding.
3. The per-instance `.profile-nav-shell { padding }` was the only
   reason that strip looked right — every other Shell needed the same
   breathing room.

## What Was Done

### Uniform Shell padding

`src/global.css`:

- Added `padding: 1.25rem 1.5rem` (20px vertical / 24px horizontal)
  to the base `.shell` rule. Every Shell across the platform now
  carries the same internal breathing room — no per-instance
  padding required.

### Drop per-instance padding

`src/components/solid/ContentShell.css`:

- `.profile-nav-shell { padding: 0.75rem 1rem }` rule removed —
  the base `.shell` rule now provides it.

### Home Shell stops using legacy absolute positioning

`src/routes/index.css`:

- `.home-search-shell` rewrites to `display: flex; flex-direction:
  column; align-items: center; justify-content: center; gap: 1rem`.
  Plus the existing `margin-top: -1.5rem` that pulls the surface
  under the crystal ball.
- `.home-search-shell .sport-tabs` (legacy, dead class after the
  NavTabs refactor) — REMOVED.
- `.home-search-shell-search` rewrites to a normal-flow flex
  centering wrapper. No more `position: absolute; top; left; right;
  transform`. No more explicit `width: min(80%, 480px)` (the inner
  SearchBar sizes itself; wrapper just centers).
- Mobile override for `.home-search-shell-search width` dropped
  (irrelevant after the wrapper rewrite).

## Files Changed

```
src/global.css
src/components/solid/ContentShell.css
src/routes/index.css
docs/progress/2026-05-14_shell-padding.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual:
  - Home Shell: NavTabs strip sits 24px inside the Shell border.
  - Profile nav: same uniform 24px gap (matches the home Shell).
  - Articles + X: list items sit 24px inside the Shell border on
    every side.

## Result

Every Shell on the platform now has the same internal padding
without consumers having to remember to set their own. The home
Shell uses the same column-flex layout pattern as the profile-nav
Shell — no more legacy absolute-positioning quirks, and adding a
third sibling (e.g., a hint line below the search input) just adds
another flex child.

Follow-up: MetaShell content layout redesign so the locked silhouette
holds for long-detail entities (user-driven).
