# Gemma summary: show the full blurb (not a 2-line teaser)

## Goal
Follow-up to the breathe pass. Scott's feedback on the live result: the look is good,
but the **2-line teaser doesn't land — show the entire blurb**. The Gemma summary is
the wow; give the whole sentence, no clamp/"more".

## What Was Done
- Renamed `ClampedSummary` → **`GemmaSummary`** (the name was now a lie) and reduced it
  to a styled `<p>` that renders the **full** `text` — no `-webkit-line-clamp`, no
  overflow measurement, no more/less toggle. Same readable typography (`0.8rem`,
  `--text-secondary`, `1.45` leading, `overflow-wrap: anywhere`).
- Swapped the three call sites (TransfersCard, PlayerSuitorsCard, leaderboard) and
  refreshed the now-stale comments. Deleted `ClampedSummary.tsx`/`.css`.

## Files Changed
- `src/components/solid/GemmaSummary.tsx` + `.css` (new); `ClampedSummary.*` (deleted)
- `src/components/solid/TransfersCard.tsx` + `.css`
- `src/components/solid/PlayerSuitorsCard.tsx`
- `src/routes/leaderboard.tsx` + `leaderboard.css`

## Verification
- `npm run typecheck` clean · `npm test` 119/119 · `npm run build` OK.

## Result
The complete Gemma summary now renders on the profile Transfers/Suitors cards and the
leaderboard Transfers board — full sentence, readable, no truncation.
