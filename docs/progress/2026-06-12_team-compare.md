# Compare for teams

## Goal
Compare (the dual-entity Composite butterfly) was players-only. Enable it for teams.

## What Was Done
One-line gate flip — `ContentShell.tsx`:
`showCompare = activeControls().includes("compare") && ctx.type() === "player"`
→ `showCompare = activeControls().includes("compare")`.

Everything else was already team-capable and just gated off:
- `CompareView` (CompositeCard) builds both sides from `getSparkline(sport, type, …)`
  (type-agnostic) and already branches on type — magnitude **score** for players,
  composite **rank** for teams — in the compare header.
- `CompareControl` / `CompareSearch` filter by `ctx.type()`, so on a team profile the
  search returns teams and `?vs=` resolves a team.
- The butterfly merges both `rating_breakdown`s by label through the same `eligible`
  filter (`in_comp && PIZZA_FACETS.includes(facet)`) the normal team pizzas use.

## Files Changed
- `src/components/solid/ContentShell.tsx`

## Verification
- `npm run typecheck` clean · `npm test` 119/119 · `npm run build` OK.
- No test asserted compare was player-only.
- Live data path confirmed: `…/football/team/18/sparkline` carries a 19-datapoint
  `rating_breakdown` (12 `in_comp`, offense/defense facets) — the butterfly's input.

## Result
Team profiles get the Compare control on the Composite tab; picking a vs team renders
the team-vs-team butterfly (offense + defense datapoints mirrored, rank in the header).
Not yet deployed — bundling with the Gemma-summary full-blurb fix.
