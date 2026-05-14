# 2026-05-14 — ShareFrame compact: drop aspect-ratio, content-driven height

## Goal

The share modal's preview card was too large for the modal viewport —
horizontal + vertical scrollbars on most viewports, with empty space
above and below the vibe content because the bordered body was forced
into a 5/6 portrait aspect-ratio while the actual card content was
much shorter. Goal: ~60% of the previous footprint, no scrollbars,
content drives the height.

## What Was Done

`src/components/solid/ShareFrame.css` tightened across the board:

- Outer frame `max-width: 600px → 380px` (~63%).
- Header band: avatar `3.5rem → 2.5rem`; entity name `1.5rem →
  1.15rem`; context line `0.85rem → 0.75rem`; gap `1rem → 0.75rem`.
- Bordered body: **dropped `aspect-ratio: 5 / 6` and `min-height:
  320px`** so the body sizes to its content + padding. Padding
  trimmed `1.25rem 1rem → 0.75rem`.
- New rule `.share-frame-body .vibe-card { min-height: 0; padding:
  0.75rem 0.5rem; }` overrides VibeCard's in-app 320px min-height
  inside the share frame so the card sits flush to its content.
- Footer: smaller font (`0.8rem → 0.7rem`, meta `0.75rem → 0.65rem`)
  and tighter gap.

## Files Changed

- `src/components/solid/ShareFrame.css`

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 pass.
- Profile SSR returns 200.
- Manual: open share modal on a vibe card — modal preview fits
  cleanly within the modal viewport without scrollbars; entity-ID
  band, bordered card with corner numerals, and footer all visible
  without scrolling.

## Result

Share preview is now a compact ~380×400 card that reads cleanly on
all viewports the modal supports. No scrollbar noise; content sits
naturally inside the chrome.
