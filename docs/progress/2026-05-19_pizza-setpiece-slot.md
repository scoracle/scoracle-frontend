# 2026-05-19 — Pizza chart 5th slot: setpiece (Special Teams / Set Pieces / Dead Ball)

## Goal

Give every profile a chart for the "phase-of-play" stat family that didn't
have a home: NFL special teams, Football set pieces, NBA dead-ball play.
One new slot, one new chart row beneath the existing four, sport-specific
label, data-driven keys verified against live API payloads.

## What Was Done

### New slot in `stats-categorizer`

`src/lib/utils/stats-categorizer.ts`:

- `CHART_SLOTS` extended from `['attack', 'possession', 'defense',
  'discipline']` to `['attack', 'possession', 'defense', 'discipline',
  'setpiece']`. `ChartSlotId` regenerates from the tuple.
- `CHART_SLOT_LABELS.setpiece = 'Set Pieces'` as the default label.
- New `SPORT_SLOT_LABEL_OVERRIDES` map renames the setpiece label per
  sport / entity type — `NFL` & `NFL_TEAM` → "Special Teams",
  `FOOTBALL` & `FOOTBALL_TEAM` → "Set Pieces", `NBA` & `NBA_TEAM` →
  "Dead Ball". Other slot labels are stable across sports.
- `resolveSlotLabel(slot, configKey)` reads override-first, falls back
  to the default. Plugged into `buildChartCategories`, which now takes
  `configKey: string` so it can render the right label.
- `categorizeForCharts` passes its computed `configKey` through;
  `categorizeRateForCharts` passes the upper-case sport (rate configs
  are sport-keyed, not sport+type-keyed).

### Stat-key routing — verified against live payloads

Before locking in keys, the team & player API payloads were probed for
each sport. Two real surprises came out, both fixed:

1. **NFL player payload uses `punt_returner_returns` /
   `punt_returner_return_yards`** — but the **team payload uses
   `punt_returns` / `punt_return_yards`.** Both forms are now wired on
   their respective configs (with a comment in the file explaining the
   asymmetry so a future reader doesn't "fix" it).
2. **Football payload uses plural penalty keys** at player level
   (`penalties_scored`, `penalties_missed`, `penalties_won`) — not the
   singular form the box-score categorizer uses for the legacy
   `goals & assists` group. And `corners` is **team-only** — players
   don't carry that key.

`CHART_CATEGORY_CONFIG` deltas (relative to upstream `main`):

```
NBA player.attack         drop ftm, ft_pct                       (lifted to setpiece)
NBA player.setpiece       ['ftm', 'fta', 'ft_pct']               (NEW)

NBA team.attack           drop ft_pct                            (lifted to setpiece)
NBA team.setpiece         ['ftm', 'fta', 'ft_pct']               (NEW)

NFL player.attack         drop field_goals_made                  (lifted to setpiece)
NFL player.setpiece       14 keys: kicking + punting + kick-return
                          + punt-return (using punt_returner_*)  (NEW)

NFL team.attack           drop field_goals_made                  (lifted to setpiece)
NFL team.setpiece         14 keys, same shape as player but using
                          team-form punt_returns / punt_return_yards (NEW)

FOOTBALL player.attack    drop penalty_goals                     (lifted to setpiece)
                          keeps `expected_goals` (added upstream in 9e3d5f5)
FOOTBALL player.setpiece  ['penalty_goals', 'penalties_scored',
                           'penalties_missed', 'penalties_won']  (NEW)

FOOTBALL team.attack      drop corners                           (lifted to setpiece)
                          keeps `expected_goals` (added upstream in 9e3d5f5)
FOOTBALL team.setpiece    ['corners', 'penalties', 'free_kicks',
                           'goal_kicks', 'throw_ins']            (NEW)
```

`CHART_RATE_CATEGORY_CONFIG` deltas:

```
NBA rate.attack           drop ftm_per_36, ft_pct                (lifted to setpiece)
NBA rate.setpiece         ['ftm_per_36', 'fta_per_36', 'ft_pct'] (NEW)
FOOTBALL rate.setpiece    []                                     (no penalties_per_90
                                                                  in payload; renders
                                                                  the "No data"
                                                                  placeholder)
```

### New `STAT_LABELS` / `STAT_ABBREVS`

Seven new entries for the football team set-piece keys:

```
penalties              → 'Penalties'         PEN
penalties_scored       → 'Penalties Scored'  PS
penalties_missed       → 'Penalties Missed'  PM
penalties_won          → 'Penalties Won'     PW
free_kicks             → 'Free Kicks'        FK
goal_kicks             → 'Goal Kicks'        GK
throw_ins              → 'Throw-Ins'         TI
```

The singular `penalty_scored` / `penalty_missed` / `penalty_goals`
entries are kept alongside — the legacy `CATEGORY_CONFIG.FOOTBALL`
box-score group still references the singular form, and the
team-level `penalty_goals` chart key continues to map.

### CSS / consumer touch-ups

- `StatsCard.css` — grid comment retitled from "4-slot pizza grid"; the
  layout is `flex-direction: column` with `gap: 1.5rem`, so the new row
  just appends. No CSS rule change.
- `StatsCard.tsx` / `CompareCard.tsx` — no logic change. Both already
  iterate `chartCategories()` / `slotPairs()` via `<For>`, so 5 slots
  render exactly like 4 did. CompareCard's JSDoc lost its stale
  "4-slot" phrase.
- `TraitsCard.tsx` unaffected — it consumes `categorizeStats` (the
  box-score categorizer), not the slot-based chart categorizer.

### Tests

`src/lib/utils/stats-categorizer.test.ts` gains coverage for the slot:

- `categorizeForCharts (slot pizza grid)`:
  - Slot order matches `CHART_SLOTS` exactly.
  - Setpiece label is correctly overridden per sport (NFL → Special
    Teams, FOOTBALL → Set Pieces, NBA → Dead Ball, NFL team → Special
    Teams).
  - NFL kicking / punting / kick-return keys land on `setpiece`.
  - NBA free throws land on `setpiece` and **no longer appear on
    attack** (regression guard for the in-place move).
  - Football player penalty keys land on `setpiece` using the **plural**
    payload form (`penalties_scored`, `penalties_missed`,
    `penalties_won`, `penalty_goals`) — and `corners` does **not**
    bleed in from the team-only naming.
  - NFL team uses `punt_returns` / `punt_return_yards`; NFL player uses
    `punt_returner_returns` / `punt_returner_return_yards`. Cross-tested
    so a future config edit can't swap the wrong form in.
  - Football team set-piece restarts (`corners`, `penalties`,
    `free_kicks`, `goal_kicks`, `throw_ins`) all land in setpiece.

- `categorizeRateForCharts`:
  - NBA per-36 rate config produces a populated "Dead Ball" slot.
  - NFL still returns `[]` from the rate categorizer (no rate config).

## Files Changed

```
src/lib/utils/stats-categorizer.ts
src/lib/utils/stats-categorizer.test.ts
src/components/solid/StatsCard.css
src/components/solid/CompareCard.tsx
docs/progress/2026-05-19_pizza-setpiece-slot.md          (this doc, NEW)
~/scoracleWiki/Progress/scoracle-frontend/
  2026-05-19_pizza-setpiece-slot.md                      (mirror, NEW)
```

## Verification

- `npm run typecheck` — clean for this change. (Three pre-existing
  `@resvg/resvg-wasm` errors live on `main` in `src/lib/og/rasterize.ts`
  — unrelated, untouched.)
- `npm test` — 110/110. Setpiece coverage went from 0 → 10 new cases.
- Stat-key routing was verified against live local-API payloads for
  one team + one player in each sport (Atlanta Hawks + Giannis;
  Patriots + Blake Grupe / Thomas Morstead; West Ham + Harry Kane).

## Result

Every profile gains one new pizza below the existing four:
- **NBA** — a 3-slice free-throw chart for every player and team.
- **NFL** — kickers / punters / returners get a populated 14-slot
  chart for the first time; offensive players see it empty (correctly).
  Teams get the same shape with team-form return keys.
- **FOOTBALL** — penalty takers like Kane get a 4-slice chart (goals
  from the spot, taken, missed, drawn). Teams get a 5-slice restart
  chart spanning every kind of dead-ball restart (corners + penalties +
  free kicks + goal kicks + throw-ins).

Combined with the upstream `expected_goals` arrival on the football
attack slot (commit 9e3d5f5), the football attack pizza now shows the
canonical actual-vs-expected pair side by side, while penalty volume
moved cleanly off the attack chart and onto its own.
