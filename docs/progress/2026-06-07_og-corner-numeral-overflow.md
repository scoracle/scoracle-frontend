# 2026-06-07 — OG card: fix bottom-right corner numeral overflow

## Goal
The bottom-right corner id numeral on every OG share card was escaping the tarot
frame's border line (spilling past the right/bottom edges), while the top-left was
fine.

## What Was Done
`lib/og/build-card.ts` `composeNumerals`: the BR mark used an **end-anchored** text
rotated 180° about its **own anchor** `(926, 1326)`. Post-rotation that pushed the
glyph box to `x ∈ [926, 926+w]` / below the pivot — past the frame's right edge
(950) and downward. Replaced it with the SAME start-anchored text as the TL, rotated
180° about the **card center** (a point-reflection): the BR mark now lands at a
perfectly symmetric inset in the opposite corner for any label width.

## Files Changed
`src/lib/og/build-card.ts`.

## Verification
`npm run typecheck` clean; `npm test` → 111 pass. Rendered OG card in prod — BR
numeral sits inside the frame, mirroring the TL inset.

## Result
Corner numerals are symmetric and contained on both corners of every share card.
