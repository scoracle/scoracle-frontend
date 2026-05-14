# 2026-05-14 — ShareFrame: card-in-frame restructure

## Goal

The Roman numerals in the share-modal preview rendered stacked at the
top-left of the entire frame instead of at the corners of the actual
card section. The 600 × 750 fixed dimensions also forced horizontal +
vertical scrollbars in the modal preview area. Both flaws.

## What Was Done

Restructured `<ShareFrame>` into the same composition the in-app
content reads as: an entity-ID band above a bordered card, with a
Scoracle attribution band below. The bordered body div now carries
the shared `.card` class, which means the existing
`.card > .shell-corner-num-tl / -br` rules from `global.css` position
the corner numerals exactly where the in-app `.card` chrome would —
top-left + bottom-right of the bordered body, not floating above the
header.

Made the frame fully responsive: `width: 100%; max-width: 600px`
replaces the fixed `600 × 750`. The bordered body uses
`aspect-ratio: 5 / 6` to stay proportionally portrait at any width.
Inner padding shifted from fixed px to relative units so children
scale with the frame.

The modal preview area no longer needs horizontal scroll — the frame
fits the modal's content width on every viewport. Vertical scroll on
small viewports remains as a graceful fallback via the modal's own
`overflow: auto`, but for typical desktop / tablet widths the frame
fits without scrolling.

## Files Changed

- `src/components/solid/ShareFrame.tsx` — restructure into header /
  bordered body (`<div class="share-frame-body card">`) / footer.
  Corner numerals moved inside the bordered body so `.card`'s
  positioning rules apply.
- `src/components/solid/ShareFrame.css` — drop fixed dimensions +
  outer chrome; new responsive layout; `aspect-ratio: 5 / 6` on the
  bordered body. Body's `.card` chrome (border, shadow, tarot SVG)
  comes from `global.css`.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 pass.
- Profile SSR returns 200.
- Manual: open share modal on the Dallas Cowboys vibe — entity-ID
  band sits cleanly above the bordered card; the IX numerals land at
  the top-left + bottom-right of the bordered card (not above it);
  no horizontal scrollbar; vertical scroll only on the smallest
  viewports.

## Result

The share preview now reads with the brand language honestly: the
card has its own chrome, the corner numerals belong to the card, and
identification + attribution sit as plain bands above and below.
Scrollbars are gone for typical viewports.

This restructure also opens a clean path for the in-app composition —
the same "borderless nav band + bordered content card" pattern can
flow up into ContentShell so the in-app card matches what the share
artifact shows. Separate plan to follow.
