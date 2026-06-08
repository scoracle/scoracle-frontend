# 2026-06-07 — Leaderboard adopts the shared ScopeStrip

## Goal
The leaderboard's players/teams + search row was a hand-rolled toolbar: a
left-aligned NavStrip toggle and a right-pushed Search disclosure
(`justify-content: space-between`). Converge it onto the shared `<ScopeStrip>` +
`<Select>` vocabulary so the entity-type selector is a dropdown and the whole row
is centered — matching the profile's scope row.

## What Was Done
- `routes/leaderboard.tsx`: replaced the `.lb-toolbar` (`<NavStrip inline>` for
  Players/Teams + `<SearchControl>`) with `<ScopeStrip>` holding a `<Select>`
  (Players/Teams, gated on `showTypeToggle()`) + the existing `<SearchControl>`.
  `TYPE_ITEMS` → `TYPE_OPTIONS` ({value,label}) for the Select. The board rail
  (Rating/Vibes/News/Transfers) stays a `<NavStrip>` — it's the primary nav, the
  parallel of the profile tabs.
- `routes/leaderboard.css`: removed the now-dead `.lb-toolbar`, `.lb-toolbar-spacer`,
  and `.lb-search*` rules (the latter were already orphaned when the bare
  `<input type=search>` became `<SearchControl>`).

## Files Changed
`src/routes/leaderboard.tsx`, `src/routes/leaderboard.css`.

## Verification
`npm run typecheck` clean; `npm test` → 111 pass. Browser (dev),
`/leaderboard?sport=FOOTBALL`: the strip is centered with a "Players ▾" Select +
"Search ▾"; the dropdown opens (Players/Teams) and selecting Teams sets
`?type=team` and updates the trigger.

## Result
The leaderboard uses the same centered control strip + dropdown vocabulary as the
rest of the platform — one less hand-rolled selector.
