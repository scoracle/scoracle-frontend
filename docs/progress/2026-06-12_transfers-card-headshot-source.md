# Transfers card: headshots + source at the end of the blurb

## Goal
Two of Scott's three transfer-card asks (the third — the "wacky" Shell border — is
still being diagnosed; see Result):
- **B.** Add the player headshot back to each row ("huge win").
- **C.** Move the cited source (NYT, ESPN, …) off the stage line to the END of the blurb.

## What Was Done
- **`GemmaSummary`** gains an optional `source` prop, rendered as a trailing
  `— <source>` (italic, tertiary) at the end of the summary. Unused args leave it absent
  (the leaderboard board is unaffected).
- **`TransfersCard`** (`TransferRow`): new avatar column — round player headshot
  (`t.image`) with an initial-letter fallback; source moved from the stage line into
  `GemmaSummary`'s `source` prop. Grid is now `rank · avatar · main · heat`.
- **`PlayerSuitorsCard`** (`SuitorRow`): mirror, with the suitor TEAM crest (square,
  `object-fit: contain` via `.transfers-avatar-team`) and the same source-in-blurb move.
- Dropped the now-dead `.transfers-source` rule.

## Files Changed
- `src/components/solid/GemmaSummary.tsx` + `.css`
- `src/components/solid/TransfersCard.tsx` + `.css`
- `src/components/solid/PlayerSuitorsCard.tsx`

## Verification
- `npm run typecheck` clean · `npm test` 119/119 · `npm run build` OK.

## Result
Rows now lead with a headshot/crest and the source reads naturally at the tail of the
grounded blurb. **A (Shell border) NOT addressed**: TransfersCard uses the same `<Shell>`
and global `.card::before` tarot-border SVG as every card (RosterCard is an equally tall
list with no height cap and would stretch identically), so there's no code-level reason
it differs — the referenced image didn't attach. Awaiting the screenshot to diagnose.
Not deployed (gated; bundling with the A fix).
