# 2026-06-13 — Tarot border crispness

## Goal
The in-app card border (`.card::before`, a `border-image` of `weathered-tarot-border.svg`)
rendered **washed-out / faint**. Scott wanted the tarot line crisp and visible, without
losing the weathered aesthetic (he explicitly rejected a clean rounded-rect alternative).

## What Was Done
Diagnosed two causes, not one:
1. The stroke was thin (`stroke-width="0.9"`).
2. The path centerline sat at `0.16` units from the viewBox edge, so with a centered
   stroke nearly half the ink fell **outside** the `0 0 100 100` viewBox and was clipped
   during border-image rasterization — the bulk of the "washed out" look.

Fix, entirely within the SVG asset:
- **Inset the centerline** to `2.0..98.0` (was `0.16..99.84`) via a linear map of every
  coordinate, so the wobble/Q-control-points/corner shape are preserved 1:1 but the full
  thicker stroke now lands inside the viewBox.
- **Thickened the stroke** `0.9 → 2.6`.
- **Removed `vector-effect="non-scaling-stroke"`** so the stroke scales predictably with
  the rasterized border-image instead of the murky non-scaling behavior.

OG share card is unaffected: `build-card.ts` re-wraps the inner path in its **own**
`<svg stroke-width="0.9">` (and `load-frame.ts`'s `stripOuterSvg` discards the file's
outer `<svg>` attrs), so the file's stroke-width drives **only** the in-app border-image.

## Files Changed
- `public/chrome/weathered-tarot-border.svg` — inset centerline + thicker stroke + dropped non-scaling-stroke.

## Verification
- Playwright harness (`/tmp/shot.js`, dev :5173, deviceScaleFactor 2):
  - Standard card (Haaland composite) — crisp top + bottom corners, mirrored corner numeral intact.
  - Empty state ("Unable to load player data") — crisp border.
  - **Transfers leaderboard (~6930px tall)** — uniform crisp line, no corner/edge distortion
    (the original "wacky" complaint). Corners stay fixed-size; only edges stretch.
- Confirmed OG decoupling by reading `build-card.ts:106-107` (own stroke-width) — no OG re-verify regression.

## Result
Crisp, visible weathered-tarot border on every card (including tall leaderboards), aesthetic
preserved. Border backlog item closed.
