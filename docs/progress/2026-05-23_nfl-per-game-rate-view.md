# 2026-05-23 — NFL per-game rate view (parity with NBA per-36 / Football per-90)

## Goal

Backend migration 014 added `_per_game` derived stats for NFL players —
every counting/volume stat now has a sibling key normalized by
`games_played`, computed by a BEFORE trigger on `player_stats`. Frontend
needs to surface those as the rate side of the StatsCard / CompareCard
toolbar, in the same shape as the existing NBA "Per 36" and Football
"Per 90" toggles.

The wrinkle: NFL is **position-aware** on the per-game side. NBA and
Football render the 5-slot pizza grid for both per-game and rate views,
but NFL collapses to a single position-targeted card
(Passing / Offense / Defense / Special Teams) via
`buildNflPositionCategory`. The rate path needs to mirror that
position-awareness or a Mahomes profile would render an empty rate
chart even with 41 valid per-game keys in the payload.

A second wrinkle: NBA and Football's base stats are *already* per-game
averages — so the existing toolbar reads `Per Game | Per 36` /
`Per Game | Per 90` correctly. NFL's base stats are season totals, so
re-using the hardcoded "Per Game" label on the base side would clash
with the new "Per Game" rate label. Resolve by naming the base tab
sport-specifically: "Total" for NFL, "Per Game" for NBA/Football.

## What Was Done

`src/lib/utils/stats-categorizer.ts`:

- Added `NFL_POSITION_STATS_RATE` parallel to `NFL_POSITION_STATS` —
  one key list per position group (quarterback / running-back /
  receiver / defensive-line / linebacker / defensive-back / special-
  teams), with volume keys swapped to their `_per_game` siblings and
  percentages / per-attempt ratios (`passing_completion_pct`, `qbr`,
  `td_int_ratio`, `yards_per_pass_attempt`, `yards_per_rush_attempt`,
  `yards_per_reception`, `catch_pct`, `field_goal_pct`) kept verbatim
  since they're already normalized. RB and WR share
  `NFL_OFFENSE_KEYS_RATE`; DL / LB / DB share `NFL_DEFENSE_KEYS_RATE`,
  mirroring the per-game shared-bundle pattern.
- Refactored `buildNflPositionCategory` to take a `rate = false` flag;
  when set, it sources keys from `NFL_POSITION_STATS_RATE[group]`
  while reusing the same `set.label` so the card identity (Passing /
  Offense / etc.) is preserved across the toggle.
- Extended `categorizeRateForCharts` signature to accept
  `entityType` + `positionGroup`. NFL players with a known group hit
  the new position-aware rate branch; other paths (NBA, Football,
  NFL without a position group) keep their existing slot-config
  behaviour.
- `getRateLabel("NFL") → "Per Game"` (was `null`).
- New `getBaseLabel(sport)` — `"Per Game"` by default, `"Total"` for
  NFL — so the toolbar base tab matches the base stats' nature
  per-sport.
- 42 new `STAT_LABELS` entries for the per-game keys ('Pass TD/G',
  'Tackles/G', etc.) and matching `STAT_ABBREVS` for box-score parity
  with NBA's `pts_per_36 → P36` convention.

`src/components/solid/StatsCard.tsx` + `CompareCard.tsx`:
- Import `getBaseLabel`; replace the hardcoded `"Per Game"` toolbar
  label with `baseLabel()`.
- Pass `type` + `positionGroup()` into `categorizeRateForCharts` so the
  NFL position-aware rate dispatch fires.
- Dropped the stale CompareCard comment claiming "NFL has no rate
  stats" — no longer true.

`src/lib/utils/stats-categorizer.test.ts`:
- `getRateLabel("NFL")` now asserts `"Per Game"`; the null fallback
  test moved to a fictional sport.
- New `getBaseLabel` block covering NFL/NBA/Football.
- `categorizeRateForCharts` block grew three new cases: NFL receiver
  collapses to a single Offense card with per-game keys; QB rate card
  surfaces `passing_*_per_game` and explicitly *not* the volume twins;
  unmapped NFL position (offensive-line) returns empty (no generic
  NFL 5-slot rate config exists, by design).

## Files Changed

- `src/lib/utils/stats-categorizer.ts`
- `src/lib/utils/stats-categorizer.test.ts`
- `src/components/solid/StatsCard.tsx`
- `src/components/solid/CompareCard.tsx`

## Verification

- `npm run typecheck` — clean.
- `npm test` — 137/137 (up from 131; six new NFL-rate assertions).
- Production payload spot-check:
  `GET /api/v1/nfl/player/34` (Mahomes) — `position_group: Quarterback`,
  41 `_per_game` keys, `passing_yards_per_game: 256.21`,
  `passing_touchdowns_per_game: 1.57`. Aaron Donald (id 1328) has the
  same 39 defensive per-game keys but his backend `position_group` is
  "Unknown" — the rate toggle correctly hides for him via the
  unmapped-group fallback, matching existing per-game-side behaviour.

UI not opened in the browser this commit — the change is purely
config + dispatch and the test suite covers both the QB and WR card
shapes. Manual flip-and-verify after deploy is the cheap final check.

## Result

NFL player profiles now show the `Total | Per Game` toggle alongside
the position-targeted pizza card. Toggling to "Per Game" swaps every
volume key for its per-game sibling without re-shuffling the card's
identity or position-filter. NBA / Football toolbars are untouched
(still `Per Game | Per 36` and `Per Game | Per 90`). The internal
shape — one position card per NFL player, fed by the same percentile
bucket regardless of toggle — keeps EntityMeta's `Rating` readout
agreeing with the chart's Overall rating on both sides of the flip.
