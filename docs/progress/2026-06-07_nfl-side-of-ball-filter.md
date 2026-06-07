# 2026-06-07 — NFL players show only their side of the ball (display-only)

## Goal

NFL rating is category-balanced across offense / defense / special, so a one-way player's
Composite was rendering as three pizzas (their side + two facets of ~0-pct noise), and the
Specialist card surfaced off-side datapoints as weaknesses. Per Scott (same display-only
philosophy as the football GK fix): show an NFL player only their own side of the ball.

## What Was Done

- New `nflSideOfBall(position)` in `position-groups.ts`: maps an NFL position → rating facet
  (`offense` / `defense` / `special`) via the existing position groups, or `null` when the
  position is unknown/unmapped (→ fall back to showing all facets, no wrong guess).
  - Why position, not data: off-position stats come through as **0, not null**, and a QB even
    has real Fumble Recoveries — so `is_specialty`'s facet is noisy for low-stat players
    (a backup DT resolved to "Field Goals/special"). The NFL leaderboard (the players users
    actually view) all carry real positions; only fringe players are "Unknown".
- `CompositeCard`: for NFL players, `groups()` keeps only the `nflSideOfBall(position)` facet
  (teams / unknown / other sports unchanged).
- `SpecialistCard`: `relevant()` gains an NFL branch — for NFL players, keep only datapoints
  whose `facet` is the player's side. (Football GK rules + the top-3/bottom-3 trim unchanged.)

## Files Changed

`lib/utils/position-groups.ts`, `components/solid/CompositeCard.tsx`,
`components/solid/SpecialistCard.tsx`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker + Playwright:
- Composite — Josh Allen (QB) → 1 pizza [Offense]; Myles Garrett (DE) → 1 [Defense];
  McCaffrey (RB) → 1 [Offense]; **NFL team → 2 [Offense, Defense]** + Discipline/Squad
  (unaffected); Wembanyama (NBA) → 1 [General] (unaffected).
- Specialist — Allen: Touchdowns + Total Yards/Receiving; Garrett: Sacks + Tackles For
  Loss/Tackling/Pass Defense/Fumble Recovery/Interceptions. No off-side datapoints.

## Result

NFL players read as one card for their side of the ball, on both the Composite and Specialist
surfaces. Engine untouched (display-only) — no ratings or leaderboards change; unknown-position
players safely fall back to all facets.
