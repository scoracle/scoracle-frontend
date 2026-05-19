# 2026-05-19 — xG on the football attack pizza chart

## Goal

Wire expected goals (xG) into the football attacking pizza chart for
both team and player profiles. xG is the headline analytics metric for
soccer — the per-game attack slot currently shows shots / accuracy /
big-chances but no xG, despite the label, abbreviation, and percentile
data already being plumbed end-to-end.

## What Was Done

Added `expected_goals` to two slot mappings in
`src/lib/utils/stats-categorizer.ts`:

- `CHART_CATEGORY_CONFIG.FOOTBALL.attack` (player) — placed second,
  right after `goals`, so actual and expected goals sit next to each
  other on the chart.
- `CHART_CATEGORY_CONFIG.FOOTBALL_TEAM.attack` (team) — placed second,
  right after `goals_for`, same pairing.

The per-90 rate variant (`CHART_RATE_CATEGORY_CONFIG.FOOTBALL.attack`)
already included `expected_goals_per_90`, so the flipped rate view was
already correct — only the per-game slot needed the addition.

No new labels or abbreviations needed:

- `STAT_LABELS.expected_goals = 'xG'` (line 489) — present.
- `STAT_ABBREVS.expected_goals = 'xG'` (line 733) — present.

The chart builder (`buildChartCategories`) silently skips stat keys
whose value is `null`/`undefined`, so this is safe for entities whose
upstream feed doesn't (yet) carry xG — they show the slot exactly as
before.

## Files Changed

```
src/lib/utils/stats-categorizer.ts
docs/progress/2026-05-19_xg-on-football-attack-chart.md  (NEW)
```

## Verification

- Edit is purely an addition to two string arrays; no type surface
  changes.
- `stats-categorizer.test.ts` doesn't pin slot contents (only sanity
  checks like `getRateLabel`), so existing tests are unaffected.
- `npm run typecheck` / `npm test` not run in this sandbox session
  (no `NODE_AUTH_TOKEN`, so package install was skipped). Worth
  re-running locally before merging the branch — though there is no
  realistic failure mode for a string-array append.

## Result

The football attacking pizza chart now surfaces xG alongside actual
goals on both player and team profiles, matching the per-90 rate
view's existing coverage. One of the most-asked-for soccer metrics
is no longer hidden behind the box-score table.
