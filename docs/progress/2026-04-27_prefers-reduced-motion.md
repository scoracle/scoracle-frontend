# prefers-reduced-motion across animation sites

**Date:** 2026-04-27
**Scope:** Tier 3 from the optimization roadmap. Pure CSS, no JS changes.

## Goal

Honor the OS-level "Reduce Motion" preference across the four remaining animation sites. Before this commit only `CompareTab.css` had a `@media (prefers-reduced-motion: reduce)` block; the rest animated unconditionally.

## What Was Done

### Card flip — `src/routes/profile.css`
The flip-card uses a 3D `rotateY` transform on `.card-flip-inner` with `.card-flip-back` overlaid via `position: absolute` + `transform: rotateY(180deg)` + `backface-visibility: hidden`. Simply removing the rotation under reduced-motion would stack both faces visibly.

The reduced-motion block instead toggles `display`: the inactive face is hidden, the active face goes to static positioning so it determines container height naturally. The container's `min-height` transition is also disabled.

### Charts flip — `src/components/solid/StatsTab.css`
Same pattern as the card flip — `.charts-flip-inner` with `rotateY` and a `.charts-flip-back` overlay, swapped via `display` under reduced-motion. Skeleton pulse animations (`stats-pulse` on `.chart-skeleton-circle`, `.skeleton-row-header`, `.skeleton-cell`) also paused.

### Pulse keyframes — three files
- `src/components/solid/EntityMeta.css` — `.skeleton-circle` and `.skeleton-line` (use `pw-pulse`).
- `src/components/solid/content-tabs.css` — `.tab-skeleton-item` (uses `tab-pulse`); shared by NewsTab, XTab, CoMentionsTab, VibesTab.
- `src/components/solid/TraitsTab.css` — `.skeleton-header` (also uses `tab-pulse`).

In each, a `@media (prefers-reduced-motion: reduce)` block sets `animation: none` on the consumers. The `@keyframes` definitions stay as-is — there's nothing to disable on the keyframe itself; the consumers reference it.

### `CompareTab.css`
Already had its block (`compare-search-slide-in` slide animation). Used as the pattern template for the other sites. No change.

## Files Changed

**Modified**
- `src/routes/profile.css`
- `src/components/solid/StatsTab.css`
- `src/components/solid/EntityMeta.css`
- `src/components/solid/content-tabs.css`
- `src/components/solid/TraitsTab.css`
- `docs/progress/2026-04-27_prefers-reduced-motion.md`

## Verification

- `npm run build` — green. Server profile chunk unchanged at 114.91 KB; CSS chunk slightly larger from the new media-query blocks (within rounding).
- `npm test` — 67/67 passing.
- Manual (browser): with macOS Accessibility → Display → Reduce Motion ON, the "Statistical Profile" toggle swaps faces instantly instead of rotating; skeleton pulses are static; the rate-toggle flip on player StatsTab also snaps. With Reduce Motion OFF, all transitions animate as before.

## Result

Tier 3 of the optimization roadmap is closed. Five animation sites now respect the OS preference; nothing else in the codebase animates unconditionally. Net code change: ~50 lines of CSS, zero behavior change for the default (motion-on) path.
