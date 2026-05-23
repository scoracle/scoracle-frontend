# 2026-05-23 — NFL meta score = positional card score

## Goal

For NFL players, the Overall score on the meta card was diverging from
the Overall score on the positional pizza below, which is confusing —
two numbers for "this player's grade" never agreeing because each was
averaging a different stat universe. NFL players are the only entity
type where one positional card is the player's full picture; everything
else (NBA, football, teams) keeps the macro-of-categories average.

Secondary goal: expand the stat bundle for skill-position offense
(receiver, running back) so a WR who takes a jet sweep or a RB who
catches a screen has that contribution reflected in their grade — and
likewise unify the defender lists so DL/LB/DB all draw from the same
comprehensive defensive set.

## What Was Done

**`src/lib/utils/stats-categorizer.ts`** — added two named stat bundles:
- `NFL_OFFENSE_KEYS` — all passing + rushing + receiving stat keys
  (plus `fumbles_lost`). Used by `receiver` and `running-back` position
  groups; label is `"Offense"`.
- `NFL_DEFENSE_KEYS` — comprehensive defender stat sheet. Used by
  `defensive-line`, `linebacker`, and `defensive-back`; label stays
  `"Defense"`. DB previously omitted `qb_hits` and `assist_tackles` —
  unified now so all three defender groups score on identical bundles.

`quarterback` and `special-teams` unchanged (those positions are already
single-domain).

**`src/components/solid/EntityMeta.tsx`** — Overall-score memo now
derives `positionGroup` from the stats response (same path StatsCard /
CompareCard use) and passes it to `categorizeForCharts`. For NFL
position-aware players that returns a single position-specific
category, so `catAverages` has exactly one entry — the meta score
collapses to that one average, which is exactly the per-card "Overall
score" number rendered under the positional pizza.

For non-NFL entities (NBA/football/teams), `positionGroup` is undefined
and the call falls through to the generic multi-category config — same
macro-of-averages behavior as before.

**`src/lib/utils/stats-categorizer.test.ts`** — refreshed labels
(`Receiving`/`Rushing` → `Offense` for the receiver and running-back
groups). Added a new test asserting a WR's card *does* include rushing
and passing keys when the player has accrued them.

## Files Changed

- `src/lib/utils/stats-categorizer.ts`
- `src/components/solid/EntityMeta.tsx`
- `src/lib/utils/stats-categorizer.test.ts`

## Verification

- `npm run typecheck` — clean
- `npm test` — 120/120 passing (added one test for cross-role offense)

UI not opened in the browser this commit.

## Result

NFL skill-position offense (QB/RB/WR/TE) and defense (DL/LB/DB) each
get one card whose Overall score equals the number shown next to the
player's face on the meta card. No more two-numbers-disagreeing
confusion. The expanded offense bundle means a WR's grade now reflects
their full offensive output, not just receiving.
