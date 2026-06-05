# 2026-06-05 — Specialist card: football GK/outfield datapoint filter (display-only)

## Goal

Football is rated positionless with goalkeepers in the same pool, so outfield players were
showing GK datapoints (Shot-Stopping / Penalty Saves / Punching / High Claims) as 0-pct
"weaknesses", and "Penalties Won" surfaced as a negative for non-pen-drawers. Per Scott,
fix this **display-only** (no engine change / no recompute / no ranking shift):
outfield players hide GK datapoints; goalkeepers show only GK datapoints + Passing;
Penalties Won is demoted to display-only.

## What Was Done

- `SpecialistCard`: a football-only `relevant(label)` filter over `rating.rating_breakdown`:
  - `sport !== football` → unchanged.
  - `Penalties Won` → always hidden (display-only).
  - goalkeeper (`getPositionGroup(position) === "goalkeeper"`) → keep ONLY
    `{Shot-Stopping, Penalty Saves, Punching, High Claims, Passing}`.
  - outfield → hide `{Shot-Stopping, Penalty Saves, Punching, High Claims}`.
- Hero now derives from the filtered set: the engine's `is_specialty` if it survived the
  filter, else the highest-pct remaining `in_spec` datapoint (so a filtered-out specialty
  never blanks the card). `others`/`shown` (top-3 + bottom-3) run over the filtered set.

## Files Changed

`components/solid/SpecialistCard.tsx` (filter + memoized hero/others).

## Verification

`typecheck` clean; `npm test` 97/97. Real worker + Playwright:
- Outfield — Nico Paz: Shooting + Dribbling/Duels/Tackling/Interceptions/Blocks/Clearances;
  **0 GK stats, no Penalties Won**. Luis Díaz likewise.
- GK — Alisson & Ederson: only Shot-Stopping/Penalty Saves/Punching/High Claims **+ Passing**.

## Result

The Specialist card shows position-relevant skills on both sides. Engine untouched, so this
is reversible and changes no ratings or leaderboards.

## Caveat / follow-up

This filters WHICH datapoints show, not the percentile VALUES — GK percentiles still reflect
the positionless engine (a top keeper reads low on Shot-Stopping because saves are
percentiled against the whole population). Correcting the values is the deferred engine
recompute (task #22).
