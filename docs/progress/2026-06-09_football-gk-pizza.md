# 2026-06-09 — Football GK pizza cleanup (frontend-only)

## Goal
Make the Football Composite pizza position-correct for goalkeepers: a GK shows ONLY
goalkeeper stats + passing; an outfielder shows everything EXCEPT the GK-exclusive stats.

## Background
The z-score breakdown carries non-null values for *every* football datapoint regardless
of position (a GK has 0-ish Goalscoring/Shooting/Duels, an outfielder has 0 saves). The
old `eligible` only dropped GK slices from outfielders *when the value was null* — so GKs
rendered a cluttered wheel of outfield noise, and outfielders could still show GK slices
when a 0 slipped through.

## What Was Done (CompositeCard.tsx)
- `isFootballGK(sport, type, position)` — position-only (GKs are reliably tagged
  "Goalkeeper"; a value test would misfire since outfielders carry 0-value GK stats),
  via `getPositionGroup("football", position)`.
- `eligible(d, gk)` is now position-aware: GK → keep only `GK_LABELS`
  (Shot-Stopping / Penalty Saves / Punching / High Claims) ∪ `GK_PASSING_LABELS`
  (Passing / Key Passes); non-GK → keep everything EXCEPT `GK_LABELS` (unconditionally,
  no longer value-gated). Applied in both the single pizza (`pizzaDatapoints`) and the
  compare butterfly (per-entity `aGk`/`bGk`).
- NBA/NFL unaffected (gk is always false off football → `!GK_LABELS.has` passes all their
  labels, none of which are GK labels).

## Files Changed
- `src/components/solid/CompositeCard.tsx`

## Verification
- `npm run typecheck` clean; `npm test` 117 passed. Prod data confirms football GKs carry
  `position='Goalkeeper'` and outfielders are Defender/Midfielder/Attacker. Deployed; a GK
  profile shows the 6 keeper+passing slices, an outfielder shows no GK slices.

## Result
Goalkeepers get a clean, relevant pizza (shot-stopping/penalty saves/punching/high
claims + passing/key passes); outfielders never show keeper stats. Frontend-only.
