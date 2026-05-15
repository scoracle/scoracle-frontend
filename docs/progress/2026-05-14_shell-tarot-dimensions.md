# 2026-05-14 — Shell tarot dimensions + width-continuity + CLS pocket

## Goal

Three issues surfaced after the prior Shell collapse:

1. **Width continuity broken** — `.shell-unlocked { max-width: none }` made
   unlocked Shells stretch full-width, while locked Shells stayed at 380.
   The home-search-shell and profile-nav strip overflowed the locked card's
   silhouette.
2. **Wrong aspect ratio** — the locked 380×320 (1.19:1) didn't match a
   real tarot card. A standard tarot is 2.75″ × 4.75″ — 1:1.73 portrait,
   or 1.73:1 flipped landscape ("card laying sideways").
3. **CLS on tab swap** — the active card pane's height changed between
   tabs, shifting the footer below.

## What Was Done

### Tarot proportions, one width variable

`src/global.css`:

- Introduced `--card-width: 600px` on `:root`. One variable governs every
  Shell's horizontal size across the platform.
- Locked `.shell` uses `aspect-ratio: 19 / 11` (= 4.75 / 2.75 — real
  tarot card flipped landscape).
- `.shell.shell-unlocked` keeps `max-width: var(--card-width)` so the
  width stays consistent; drops the aspect ratio entirely. Height is
  pure content-driven.

Bumping `--card-width` once widens every Shell + share-frame at the same
ratio. (Iterated through 380 → 600 in conversation; landed on 600 as
the right tarot-like presence.)

### Drop the legacy width overrides that fought Shell

- `src/components/solid/EntityMeta.css` — `.meta-widget` no longer
  sets `max-width: 750px` or `overflow: hidden`; Shell now owns width.
- `src/routes/index.css` — `.home-search-shell` no longer sets
  `max-width: 560px` or its mobile `max-width: 92%` override. Local
  rules now: only `position: relative` + `min-height: 180px` (because
  its tabs + search input are absolutely positioned and don't
  contribute to natural flow) + the negative top margin that pulls
  it under the crystal ball.

### Share-frame matches Shell width

`src/components/solid/ShareFrame.css` — `.share-frame { max-width:
var(--card-width) }` so the share artifact silhouette tracks the
in-app card.

### CLS pocket on the active pane

`src/components/solid/ContentShell.css` — `.content-shell-panes`
gets `min-height: 800px`. Tab swaps within the reservation don't
shift the footer below. Cards taller than the reservation grow
past it as today.

## Files Changed

```
src/global.css
src/components/solid/EntityMeta.css
src/components/solid/ShareFrame.css
src/components/solid/ContentShell.css
src/routes/index.css
docs/progress/2026-05-14_shell-tarot-dimensions.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `npm run dev` + SSR smoke across all six `?tab=` values — 200.
- Manual: home page, profile page (player + team), share modal preview.

## Result

The platform finally has the size continuity promised. Every Shell on
every page sits at exactly the same 600px width, locked or unlocked.
Locked cards are 600×348 (tarot 1.73:1). Unlocked cards are 600 wide,
height content-driven. The home-search-shell, profile-nav, and active
card all share the same vertical column silhouette.

Follow-ups (user-driven):

- MetaShell + VibeCard content layouts redesigned to fit 600×348
  (currently overflow the locked silhouette).
- Cards' internal padding — text touches Shell borders on
  Articles / X / nav (next commit).
- `--card-width` iterates further if 600 doesn't read right.
