# Transfers + Suitors render through `<Card>` (Card pillar)

## Goal
Scott (re the "wacky" transfers border): the ledger feature cards should render through the
**`<Card>`** pillar component, not bare `<Shell>` — "we should always be using Card for
adding new feature cards." Per `~/scoracleWiki/wiki/Architecture/Card Pillar.md`, `<Card>` is
the first-class content unit (Shell chrome + registry-driven share); the 4 canvas cards were
migrated to it on 2026-06-03 but the ledger cards (news/roster/transfers) were left on `<Shell>`,
and the new PlayerSuitorsCard was (wrongly) built on `<Shell>` too.

## What Was Done
- `TransfersCard` body now renders `<Card id="transfers">` (was `<Shell>`).
- `PlayerSuitorsCard` body now renders `<Card id="suitors">` (was `<Shell>`).
- Skeletons stay on `<Shell>` (matches the canvas-card skeleton pattern).

## Files Changed
- `src/components/solid/TransfersCard.tsx`, `src/components/solid/PlayerSuitorsCard.tsx`

## Verification
- `npm run typecheck` clean · `npm test` 119/119 · `npm run build` OK.

## Result / caveat
Aligns transfers + suitors with the Card pillar convention. **Caveat to verify visually:**
platform share is currently PAUSED (`shareable:false` for every card, incl. transfers/suitors),
so today `<Card>` composes the *same* Shell chrome as bare `<Shell>` (it only adds a
`<ShareTrigger>` when shareable) — and the /leaderboard renders fine on bare `<Shell>` (it can't
use `<Card>`, which needs ProfileContext). So this corrects the convention; whether it changes
the border pixels needs an on-device check. Deploying for Scott to confirm A.
