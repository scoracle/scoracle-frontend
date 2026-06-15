# 2026-06-15 — Special card commentary + leaderboard News board

## Goal
Finish the two-rail frontend (B6): render the Gemma **stat commentary** on the Special card, and
bring a **News (narratives) board** back to the leaderboard.

## What Was Done
- **Sparkline type**: `SparklineResponse` gains `commentary: StatCommentary | null` (matches the
  backend's additive `commentary` key in the `sparkline` payload).
- **SpecialistCard**: renders the on-field identity analysis via `<GemmaSummary>` (the actual read,
  not a strengths/weaknesses list) below the hero skill; `null` until the backfill reaches the
  entity-season. New `.specialist-commentary` style.
- **Leaderboard News board**: `newsLeaderboardUrl` + `getNewsLeaderboard` (`NewsLeader` extends
  `BoardEntry` with `narrative_title` + `body`); a "News" board in `BOARD_ITEMS`/blurbs/dispatch, and
  a row-mapper case (headline as the sub-line, impact as the metric, the write-up as the expandable
  blurb). Reuses the existing `DisplayRow` list render. (Backend `/leaderboard/news` was repointed to
  the narratives board in B5.)

## Files Changed
- `src/lib/data/sparkline.server.ts`, `src/components/solid/{SpecialistCard.tsx, SpecialistCard.css}`
- `src/lib/utils/data-sources.ts`, `src/lib/data/leaderboard.server.ts`, `src/routes/leaderboard.tsx`

## Verification
- `npm run typecheck` + `npm run build` clean.
- Backend ready: `sparkline` carries `commentary` (Giannis notability 94); `/leaderboard/news` →
  narratives (Chelsea "Cucurella to Real Madrid" 96).
- Visual/dev check + the backend sparkline restart pending before `cf:deploy`.

## Result
The stats rail now shows its narrative (the identity analysis) on the Special card, and the
leaderboard ranks the hottest narratives — the two-rail reveal, end to end.
