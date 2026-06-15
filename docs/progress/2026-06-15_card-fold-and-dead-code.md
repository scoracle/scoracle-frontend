# 2026-06-15 — Fold Vibe/Transfers/Suitors onto the news rail + dead-code sweep

## Goal
Complete the two-rail consolidation (audit Tier 3) and remove dead code (Tier 1): the cards that
re-fetched data the news rail already carries now read the rail, and the article-feed-era fetchers
are deleted.

## What Was Done
- **Card fold** — VibeCard reads `getNewsRail().vibe.current`; TransfersCard + PlayerSuitorsCard read
  `getNewsRail().transfers` (a team's linked players / a player's suitor clubs). Because `query()`
  dedups by `[fn, ...args]`, all four cards (News + Vibe + Transfers/Suitors) now share **one**
  `getNewsRail` fetch per entity instead of three separate calls. Registry preloads repointed to
  `getNewsRail`. SuitorRow takes `TransferRumor` (the rail's shape).
- **Dead-code deletions** — removed `news-feed.server.ts` (`getNewsFeed`), `news.server.ts`
  (`getNews`), `team-results.server.ts` (`getTeamResults`), `suitors.server.ts` (`getSuitors`),
  `url.ts` (`sanitizeUrl`) + `url.test.ts`. All confirmed zero live importers after the fold.
- `leaderboard.tsx`: corrected the stale "News was removed" header (the narratives News board is back).

Kept: `vibe.server.ts` (`getVibe` still used by EntityMeta + the OG render), `transfers.server.ts`
(the `TransferRumor` type is shared), `twitter.server.ts` (X is parked, not dead).

## Files Changed
- `src/components/solid/{VibeCard,TransfersCard,PlayerSuitorsCard,card-registry}.tsx`, `src/routes/leaderboard.tsx`
- deleted: 6 files above

## Verification
- `npm run typecheck` + `npm run build` clean.

## Result
One rail fetch hydrates the whole news side of a profile (News + Vibe + Transfers); ~250 lines of
dead code gone. The rails-own-data / cards-own-presentation model, realized.
