# 2026-07-05 - DB-First Leaderboard/Profile Sync

## Goal

Make `/leaderboard` the comprehensive ranked research database and keep `/profile` as the deep drill-down for one entity.

## What Changed

- Removed Roster from profile tab types, registry, preload wiring, share tab allow-list, and valid tab parsing.
- Deleted the unused web `RosterCard`, roster fetcher, and leaderboard-local `SearchControl`.
- Added visible leaderboard boards for Rating, News, Vibe, Momentum, Sigil, and Transfers/Trades.
- Replaced visible Trending vocabulary with Momentum while preserving legacy URL handling.
- Added URL-backed leaderboard scope controls for sport, entity type, league, conference, division, team, position group, season, and product scopes.
- Routed leaderboard rows to the relevant profile detail tab.
- Team-scoped player Rating/Fantasy boards render null product data as `--`.
- Kept home search global and AppRail/search/compare flows sport-scoped.

## Files Changed

- `src/routes/leaderboard.tsx`
- `src/lib/data/leaderboard.server.ts`
- `src/lib/utils/data-sources.ts`
- `src/components/solid/AppRail.tsx`
- `src/components/solid/LeaderboardMenu.tsx`
- `src/components/solid/card-registry.tsx`
- `src/contexts/profile.ts`
- `src/lib/utils/profile-tabs.ts`
- `src/lib/utils/share-url.ts`
- `src/lib/cards/card-meta.ts`
- `src/lib/cards/og-bodies.ts`
- related tests and deleted roster/search files

## Verification

- `npm run typecheck`
- `npm test -- --run`
- `npm run build`

## Result

The web app now treats leaderboard as the ranked exploration surface and profile as detail, with roster discovery moved to team-scoped player leaderboards.

## Follow-Up

- Add richer backend-backed scope option metadata when the bundled JSON is no longer enough.
