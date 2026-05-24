# 2026-05-24 — Composite Rating wired across the profile + Vibes/Score sparklines

## Goal

Backend shipped two waves of work today:
1. (morning) Per-event composite scores on three endpoints (trends,
   profile, team results) + a season composite on profile meta.
2. (afternoon) The trends payload's per-event score array expanded
   from "last 3 events" to "every played event this season" and
   gained a `start_time` per row, after the renamed field
   (`entity_recent_scores` → `entity_event_scores`).

Wire all of it into the SolidStart frontend in one pass, and while
the trendline visual language is fresh in the user's mind, upgrade
the Vibes section to use the same sparkline shape (it was a 5-row
list; sparkline reads direction-and-magnitude faster).

## What Was Done

### Types

`src/lib/data/trends.server.ts`:

- New `TrendsEventScore` interface — `{ fixture_id, composite_score,
  minutes_played, start_time }`.
- `TrendsResponse` gains:
    - `entity_event_scores: TrendsEventScore[]` (every played event,
      newest first; composite_score nullable for DNP / empty stats),
    - `entity_season_score_avg: number | null` (headline; null →
      hide the whole section),
    - `peer_season_score_avg: number` (reference line anchor).

`src/lib/data/stats.server.ts`:

- `StatsResponseMeta.season_composite_score?: number | null` (the
  backend's authoritative season rating; EntityMeta's chip reads
  this).

`src/lib/data/team-results.server.ts`:

- `TeamResultGame.composite_score: number | null` (per-game rating;
  Record column reads this).

### TrendsCard — Rating section (new, top of card)

`src/components/solid/TrendsCard.tsx`:

- New section labeled **Rating · Season**, placed first in the
  vertical stack because composite rating is the at-a-glance summary
  and the per-stat rows below are the breakdown.
    - Headline: big tier-colored season composite (rounded), readable
      from across the room.
    - Full-season sparkline (280×60 viewBox): faint dashed peer-cohort
      reference line; one tier-colored dot per played event positioned
      by `start_time` (oldest left → newest right) so back-to-backs
      cluster and quiet stretches read as gaps; per-run polylines
      connect consecutive non-null dots without fabricating straight
      lines across DNP gaps.
    - Axis row under the sparkline: `[oldest date] [peer ~N caption]
      [newest date]` — the per-dot detail row that lived here in the
      3-event era was dropped when the window expanded past ~10 dots.
      Per-event minute badges + DNP labels retired with it.
- Section gates on `entity_season_score_avg != null` per backend
  spec (don't derive from per-event array when the authoritative
  season number is null).
- Dropped the now-unused `MIN_MINUTE_THRESHOLDS` / `isSmallSampleMinutes`
  helpers — the small-sample minute badge was a 3-event-era feature;
  reviveable when hover-tooltips land.

### TrendsCard — Vibes upgraded to sparkline

`src/components/solid/TrendsCard.tsx`:

- Old 5-row list (`today 89, 1d ago 81, ...`) replaced with a
  time-positioned sparkline matching the Rating section's visual
  language so the two read as siblings.
    - Headline: latest sentiment number (tier-colored).
    - 160×52 sparkline over the 7-day window: faint dashed reference
      line at sentiment 50 (neutral midpoint — vibes have no peer
      cohort), polyline through chronologically-sorted snapshots,
      tier-colored dots at actual `generated_at` positions (so a
      flurry of snapshots in one news cycle reads differently from
      steady once-a-day cadence).
    - X-axis caption: `7d ago / today`.
- Removed `dayLabel`, `utcDay`, `MAX_VIBE_ROWS` constants — the
  row list they powered is gone.

### TrendsCard — Record column gains composite

`src/components/solid/TrendsCard.tsx`:

- Each `<li class="trends-record-row">` gains a trailing
  `.trends-record-composite` cell: tier-colored rounded value when
  present, muted `·` when null.
- Grid template extended from `auto auto 1fr auto` →
  `auto auto 1fr auto auto`.

### EntityMeta — Rating chip switched to backend value

`src/components/solid/EntityMeta.tsx`:

- `overallScore()` memo rewritten — was ~30 lines of pooled-percentile
  computation walking `pickPercentiles` → `categorizeForCharts`. Now
  reads `stats()?.meta?.season_composite_score` and rounds. Same
  render path (chip with tier color, hidden when null). Big motivation
  comment explains the swap so a future reader doesn't wonder why two
  "overall rating" computations coexisted.
- Imports of `pickPercentiles` / `categorizeForCharts` retired
  (only used inside the old overallScore body).

### Naming

- User-visible "Score" label in TrendsCard's first section is now
  "Rating", matching EntityMeta's chip — single name for the same
  concept across the page. Internal CSS class names + variable names
  stay (`.trends-score-headline`, `.trends-score-sparkline`, etc.)
  to avoid churn that doesn't change behavior.

### CSS

`src/components/solid/TrendsCard.css`:

- New `.trends-section-score` block: `.trends-score-headline`
  (display-font 2.4rem tabular), `.trends-score-sparkline-wrap`,
  `.trends-score-sparkline`, `.trends-score-peer-line` (1px dashed
  tertiary, 45% opacity), `.trends-score-segment` (1.5px tertiary,
  35% opacity, round caps + joins), `.trends-score-dot`
  (2.25r, card-color stroke for cluster legibility), and the new
  3-cell `.trends-score-axis` flexbox (oldest-date · peer-caption ·
  newest-date) sized to the 280px sparkline width.
- New `.trends-section-vibes` block: mirrors the score block's
  classes with `vibe-` prefixes (`.trends-vibe-headline`,
  `.trends-vibe-sparkline-wrap`, `.trends-vibe-sparkline`,
  `.trends-vibe-neutral-line`, `.trends-vibe-segment`,
  `.trends-vibe-dot`, `.trends-vibe-axis`). Old `.trends-vibe-row`,
  `.trends-vibe-day`, `.trends-vibe-score` rules deleted with the
  row list.
- Record row grid template extended to 5 columns + new
  `.trends-record-composite` + `.trends-record-composite-value`
  styling matching the row's typography.

## Files Changed

- `src/lib/data/trends.server.ts`
- `src/lib/data/stats.server.ts`
- `src/lib/data/team-results.server.ts`
- `src/components/solid/TrendsCard.tsx`
- `src/components/solid/TrendsCard.css`
- `src/components/solid/EntityMeta.tsx`

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- Live `/api/v1/nba/player/246/trends` (Jokic): 83 events,
  `Oct 23 → Apr 18`, headline 91 (elite tier post-migration-018
  normalization), peer ~44.
- Live `/api/v1/football/team/18/trends` (Spurs): 37 events,
  `Aug 17 → May 19`, headline 65, peer ~48.
- Live `/api/v1/nba/player/246` — `meta.season_composite_score`
  flows into EntityMeta's Rating chip via the existing stats
  query cache (no second request).

UI not opened in the browser this commit. Worth a spot-check on
a player with no scored events (Rating section should hide) and
on a player mid-season with DNP gaps (polylines should break at
the gap rather than draw straight through).

## Known follow-ups

- **Vibes still 7 days.** The Rating sparkline now spans the full
  season; the Vibes sparkline still spans 7 days. User asked to
  extend Vibes to the same season window — needs a backend change
  to expand the `vibes.snapshots` window and likely a daily-average
  downsample step (raw vibe snapshots can be hundreds per game,
  which doesn't fit a sparkline). Pending backend prompt.
- **Hover-tooltips** for per-dot inspection across both sparklines
  would let users recover the per-event minute / DNP detail that
  the dense-dot layout dropped.
- **`stats_contributed`** metadata still deferred on the backend.
  Useful for disclaiming thin-coverage composites once it ships.

## Result

A coherent rating system across the profile page: EntityMeta's
chip, TrendsCard's Rating headline, and the per-event sparkline
dots all read the same number with the same tier coloring. The
Vibes section gained the same sparkline grammar; the two sections
above the stats rows now read as siblings rather than two
different layouts. Record rows gained a composite column so per-
game rating reads alongside W/L/D + score.
