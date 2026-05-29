# Remove "All-time great" badge from EntityMeta

## Goal
The "All-time great" pill on the profile meta card wasn't dialed in — its
shape/alignment looked off and the feature wasn't finished. Remove it
entirely so the meta card shows just the populated scores (Rating, Vibe,
details) with no extra flair.

## What Was Done
- Deleted the badge JSX block (`ErrorBoundary` → `Suspense` → `Show` →
  `.pw-alltime-great`) from `EntityMeta.tsx`.
- Removed the `allTimeGreat` `createMemo` and the
  `ALLTIME_GREAT_THRESHOLD` constant that drove it.
- Removed the `.pw-alltime-great`, `.pw-alltime-great-badge`, and
  `.pw-alltime-great-star` rules from `EntityMeta.css`.
- Updated stale doc comments in `stats.server.ts` and `trends.server.ts`
  that referenced the removed badge. The
  `season_composite_rank_alltime` / `entity_alltime_score_rank` fields are
  retained on the response types for future in-Card use.

## Files Changed
- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/EntityMeta.css`
- `src/lib/data/stats.server.ts`
- `src/lib/data/trends.server.ts`

## Verification
- `grep` confirms no remaining references to `allTimeGreat`,
  `ALLTIME_GREAT`, or `pw-alltime` in `src/`.
- JSX structure around the removed block verified intact (Rating/Vibe rows
  flow straight into the `details` `<For>`).
- Test/typecheck runs unavailable in this environment (deps not installed —
  private `@scoracle/tokens` requires a PAT); change is a pure markup/CSS
  removal with no logic dependents.

## Result
Profile meta card renders the score readouts only — no all-time great pill.
