# 2026-05-23 — NFL position-aware stats: one card per player

## Goal

Stop serving stats that don't belong to a player's position. Specifically:
CeeDee Lamb (WR) was getting Defense and Special Teams pizza cards he
never logged stats for, and his Traits surface treated his ~4 incidental
tackles as a "weakness" because the percentile was low. The fix is
position-aware filtering at the categorizer layer plus a tightening of the
NFL profile from the generic 5-slot grid down to one position-targeted
card.

## What Was Done

### `stats-categorizer.ts` — new NFL position config + helper

`src/lib/utils/stats-categorizer.ts`:

- Added `NFL_POSITION_STATS: Record<positionGroup, { label, keys }>` covering
  the seven NFL position groups that map to a stat universe:
  - `quarterback` → Passing core + rushing + INTs/sacks (counters)
  - `running-back` → Rushing + receiving + fumbles_lost
  - `receiver` (WR/TE) → Receiving + fumbles_lost
  - `defensive-line` / `linebacker` / `defensive-back` → Defense
    (tackles, sacks, TFL, QB hits, INTs, PDs, fumbles forced/recovered)
  - `special-teams` (K/P) → FG/XP + punts/touchbacks
  - `offensive-line` intentionally absent — no OL stats in the schema,
    so it falls through to the legacy 5-slot layout
- Added `buildNflPositionCategory(stats, percentiles, positionGroup)` →
  one `Category` whose `stats` array is the position's stat universe
  (with valid values + percentiles), labeled "Receiving" / "Passing" /
  "Rushing" / "Defense" / "Special Teams" per position.
- Extended `categorizeForCharts(...)` with an optional 5th
  `positionGroup` param. When sport === 'NFL' && entityType === 'player'
  && positionGroup is mapped → returns `[singlePositionCategory]`.
  Otherwise falls through to the existing 5-slot pipeline (preserves
  Football / NBA / NFL-team behavior 1:1).
- Extended `categorizeStats(...)` with the same param. Builds a
  `Set<string>` of allowed keys from `getNflPositionStatKeys` and
  filters every NFL category's stat-key sweep. Off-position keys can no
  longer reach the Traits extractor.
- Exported `getNflPositionStatKeys(positionGroup)` so callers can
  introspect the allowlist if they need it later (e.g. compare card).

### Wired position group through the three consumers

The backend already publishes the player's raw position in
`percentile_metadata.position_group` (it's the same value the SQL
percentile partition is keyed off). We normalize it via the existing
`getPositionGroup('nfl', rawPosition)` so "OLB" / "ILB" / "MLB" all
collapse to `linebacker`, etc.

`src/components/solid/StatsCard.tsx`:

- Imported `getPositionGroup` and `StatsResponse`.
- New module-level `resolvePositionGroup(data, sport)` helper reads
  `percentile_metadata.position_group` (falls back to
  `scoped_percentile_metadata`) and normalizes.
- `slotCategories()` now passes the position group through to
  `categorizeForCharts`. NFL players collapse to one Shell; non-NFL
  and unknown positions keep the existing 5-slot behavior.

`src/components/solid/TraitsCard.tsx`:

- Same `resolvePositionGroup` helper.
- `traits()` memo now passes the position group through to
  `categorizeStats`. A WR's tackle stats can never appear in Strengths
  or Weaknesses.

`src/components/solid/CompareCard.tsx`:

- Same helper, plus a new `primaryPositionGroup` memo.
- Both `primarySlots` and `compareSlots` pass the **primary's** position
  group through. Cross-position compares (e.g. WR vs CB) collapse both
  sides to receiving, with the CB's pizza rendering as mostly-empty
  rings — which is the honest answer.

## Files Changed

- `src/lib/utils/stats-categorizer.ts` — new NFL position config,
  `buildNflPositionCategory`, `getNflPositionStatKeys`,
  `categorizeForCharts` + `categorizeStats` extended with optional
  `positionGroup` param.
- `src/components/solid/StatsCard.tsx` — `resolvePositionGroup` helper,
  wire-up.
- `src/components/solid/TraitsCard.tsx` — same.
- `src/components/solid/CompareCard.tsx` — same, plus
  `primaryPositionGroup` memo shared across both side's categorizers.
- `src/lib/utils/stats-categorizer.test.ts` — 9 new tests under
  "NFL position-aware single-card layout": single-card collapse,
  off-position drop, label-per-group, QB rushing inclusion, unknown
  position fallback, OL fallback, non-NFL untouched, and the Traits
  path filter behavior.

## Verification

- `npm run typecheck` — clean.
- `npm test -- --run` — 119/119 pass (was 110 before this change).
- `npm run build` — clean Cloudflare Workers build.

Browser smoke not yet run on this branch.

## Result

NFL profiles now render one position-targeted pizza card. WR/TE see
Receiving; QB sees Passing (with rushing rolled in); RB sees Rushing
(with receiving rolled in); DL/LB/DB see Defense; K/P see Special
Teams. Traits drops off-position stats so a WR's stray tackles can't
surface as a weakness. Non-NFL sports and NFL-team profiles are
untouched. Offensive-line and unmapped positions fall back to the
legacy 5-slot layout.
