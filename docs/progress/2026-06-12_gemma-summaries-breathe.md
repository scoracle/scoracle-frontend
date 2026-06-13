# Let the Gemma transfer summaries breathe

## Goal
The Gemma-generated transfer summaries are the product's wow, but they rendered at
`0.66rem`, `--text-tertiary`, on a single `white-space: nowrap` line behind a
tap-to-expand chevron — barely readable on both the profile Transfers card and the
`/leaderboard` Transfers board. Give them room to breathe.

## What Was Done
- **New shared `<ClampedSummary>`** (`components/solid/ClampedSummary.tsx` + `.css`):
  the blurb shown **by default** at `0.8rem` / `--text-secondary` / `1.45` leading,
  clamped to **2 lines**, with a `more`/`less` toggle that appears **only when the
  text actually overflows** (measured via `scrollHeight > clientHeight` in `onMount`
  — client-only, so no hydration mismatch; the CSS clamp still truncates during SSR).
- **`TransfersCard`** (profile): rebuilt the row as a `TransferRow` sub-component —
  name line, then a **stage line** (tier-colored dot + verdict label + `per <source>`),
  then the summary via `<ClampedSummary>`. Row top-aligns so the summary flows beneath.
- **Leaderboard Transfers board**: the blurb now renders by default via the same
  `<ClampedSummary>` (spanning cols 3→end under the name). Removed the chevron toggle,
  the per-rank `openBlurbs` Set + `isBlurbOpen`/`toggleBlurb`, the collapse-on-switch
  effect, and the `.lb-row-expandable` chevron column — the shared component owns the
  open state (and `<For>` remounts on board/sport switch, resetting it).

Both surfaces now read identically because the typography + behavior live in one place.

## Files Changed
- `src/components/solid/ClampedSummary.tsx` (new)
- `src/components/solid/ClampedSummary.css` (new)
- `src/components/solid/TransfersCard.tsx`, `TransfersCard.css`
- `src/routes/leaderboard.tsx`, `leaderboard.css`

## Verification
- `npm run typecheck` clean · `npm test` 119/119 pass · `npm run build` OK.
- Visual QA pending on deploy (no headless browser on the prod box).

## Result
The grounded one-liner is legible at a glance on both the profile card and the
leaderboard, expandable to full with `more`. Not yet pushed/deployed — gated on Scott.
