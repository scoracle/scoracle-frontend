# 2026-05-23 — TrendsCard Stats: dual-delta (Self + League)

## Goal

For a dominant entity (live example: football team_id 503, best team
in a weak 17-team league), every Stats row was reading +80% to +500%
vs peers — true, but uninformative. The card couldn't answer "is this
team's recent stretch a step up or down for *them*?" — peer comparison
alone flatlines when the entity is an outlier.

Backend shipped `entity_season_avgs` in the trends payload alongside
the existing `peer_season_avgs` (same unit normalization via migration
016). This commit wires it into TrendsCard so each Stats row carries
two signed deltas: the team's own season baseline (Self) and the peer
cohort baseline (League). For team 503 specifically, `through_balls`
now shows `−68%` Self / `−4%` League — i.e. "league-average overall,
but they've fallen off their own form."

## What Was Done

`src/lib/data/trends.server.ts`:

- `TrendsResponse.entity_season_avgs: Record<string, number>` added,
  mirroring the existing `peer_season_avgs` shape.

`src/components/solid/TrendsCard.tsx`:

- `StatRow` interface gains `selfBaseline`, `selfDelta`,
  `peerDelta`, and a `sortMagnitude` field. Renamed `peer` semantics:
  the old single `delta` is now explicitly `peerDelta`, with `selfDelta`
  nullable for keys/players where the entity has no own-season value.
- `buildStatRows` reads both maps. Sort priority uses
  `max(|selfDelta|, |peerDelta|)` so a stat that's flat-vs-peers but
  big-vs-self still surfaces — exactly the case the user flagged.
  Final intra-top sort prefers signed self-delta when present (peer
  fallback for player rows) so the "what's hot" reading order
  reflects the headline signal.
- New `showSelfColumn` memo gates the dual-column rendering on
  `Object.keys(entity_season_avgs).length > 0`, per the backend
  integration spec — player payloads land in single-column shape.
- Stats render block now produces a column-header row (`Self` /
  `League` small caps) when in dual mode, and each data row renders
  the appropriate delta columns. Recent value takes the Self tint
  when present (it's the headline trend signal); falls back to peer
  for single-column rows.

`src/components/solid/TrendsCard.css`:

- `.trends-stat-row` keeps its 4-column shape as the default.
  `.trends-stat-rows-dual` parent flips both header and data rows to
  a 5-column template — no per-row class toggling needed.
- New `.trends-stat-header` + `.trends-stat-col-label` for the small
  caps SELF / LEAGUE column titles. Header comment rewritten to
  reflect the new row anatomy and the dual-column activation rule.

## Files Changed

- `src/lib/data/trends.server.ts`
- `src/components/solid/TrendsCard.tsx`
- `src/components/solid/TrendsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- Live `/trends` smoke for team 503 (the original noisy case):
  ```
  penalties            recent= 1.00  self= 0.35  peer= 0.17   self=+183%  peer=+496%
  hit_woodwork         recent= 2.00  self= 0.76  peer= 0.38   self=+162%  peer=+430%
  good_high_claim      recent= 1.00  self= 0.41  peer= 0.76   self=+143%  peer= +31%
  saves_insidebox      recent= 2.50  self= 1.38  peer= 2.18   self= +81%  peer= +15%
  through_balls        recent= 1.00  self= 3.12  peer= 1.04   self= −68%  peer=  −4%
  shots_outsidebox     recent=10.33  self= 6.18  peer= 4.16   self= +67%  peer=+148%
  ```
  Self column now exposes the missing signal (e.g. `through_balls`
  −68% Self / −4% League — a real form drop hiding inside an
  otherwise league-average row).
- Player smoke (NBA player) returns `entity_season_avgs: {}` per the
  backend spec — frontend falls back to the single-column layout
  without rendering an empty Self column.

UI not opened in the browser this commit. The vertical rhythm gains
one header row when Stats is in dual mode (~12px); rows themselves
stay the same height.

## Result

For dominant entities, the Stats section finally surfaces self-form
signal underneath the peer dominance. For typical entities (median
percentile, normal cohort delta), both columns roughly agree and
reinforce each other. For player profiles, the section visually
collapses back to the existing 4-column shape since the backend
omits the self field — zero regression.
