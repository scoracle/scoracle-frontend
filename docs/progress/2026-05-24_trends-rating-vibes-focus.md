# 2026-05-24 — TrendsCard: trim to Rating + Vibes sparklines only

## Goal

The Rating and Vibes sparklines that landed earlier today are the
clear stars of the TrendsCard surface. The Stats / Record / Mentions
sections that sat below them read as background noise next to the
two sparklines and were costing render + (Record) fetch budget for
content users weren't reading. Trim those three sections out of the
Card so the sparklines have the stage, while keeping their backing
queries + utility files intact for easy revival.

This mirrors the earlier `CoMentionsCard` disconnection pattern:
code stays available for paste-back, but the surface stops rendering
it and stops paying the data-fetch cost.

## What Was Done

### TrendsCard

`src/components/solid/TrendsCard.tsx`:

- Reduced to two sections only: Rating (top) + Vibes (bottom), with
  the existing horizontal hairline divider between them.
- File rewritten end-to-end (clean rewrite was cheaper than a hundred
  surgical deletes). New file is ~330 lines vs ~735 lines before.
- Removed entirely (sections):
    - Stats block — `buildStatRows`, `StatRow`, `MAX_STAT_ROWS`,
      `showStats`, `statRows`, `statsRange`, `showSelfColumn`, plus
      the per-stat row JSX with its Self / League dual-delta layout.
    - Record block — `summarizeRecord`, `RecordSummary`,
      `MAX_RECORD_ROWS`, `recordSummary`, `showRecord`, plus the
      per-game scoreline list JSX. The `getTeamResults` createAsync
      is no longer fired from this Card.
    - Mentions block — `tweetToArticle`, `articleAgeMs`,
      `MAX_MENTION_ROWS`, `MENTION_WINDOW_MS`, `mentions`,
      `showMentions`, plus the per-entity rows JSX. The `getNews`,
      `getTwitterFeed`, `getEntities` createAsync calls are no
      longer fired from this Card. (`getNews` + `getTwitterFeed`
      still fire from `firePreloads` because Articles + X tabs
      consume them; `getEntities` had no other consumer — see
      profile.tsx note below.)
- Imports trimmed accordingly:
    - Dropped: `A` (router link), `getTeamResults`, `TeamResultGame`,
      `getNews`, `getTwitterFeed`, `Tweet`, `getEntities`,
      `findCoMentions`, `Article`, `CoMention`, `tierColorFromDelta`,
      `LOWER_IS_BETTER`, `getStatLabel`.
    - Kept: `tierColor`, `getTrends`, `useProfile`, `EmptyCard`,
      `Shell`, `Skeleton`, plus the `createMemo` / `createAsync` /
      `Show` / `For` building blocks.
- Helpers folded inward: `formatRecordDate` was renamed
  `formatAxisDate` (lifted out of the deleted Record section but
  still consumed by both sparklines' axis labels). Same `Intl.
  DateTimeFormat` UTC formatter; just a clearer name now that
  Record is gone.
- `TrendsCardSkeleton` rewritten — used to mock a stats-row vibe;
  now mirrors the two-sparkline rhythm.

`src/components/solid/TrendsCard.css`:

- Trimmed in parallel — only the Rating + Vibes families remain
  (`.trends-section-score` + `.trends-score-*`, `.trends-section-
  vibes` + `.trends-vibe-*`, the shared `.trends-card` /
  `.trends-section` / `.trends-divider` / `.trends-section-label`
  scaffolding). New file is ~173 lines vs ~410 lines before.
- Dropped (no remaining consumer):
    - Stat row classes: `.trends-stat-row`,
      `.trends-stat-rows-dual`, `.trends-stat-header`,
      `.trends-stat-col-label`, `.trends-stat-key`,
      `.trends-stat-value`, `.trends-stat-peer`,
      `.trends-stat-delta`, `.trends-stat-arrow`.
    - Record row classes: `.trends-record-rows`,
      `.trends-record-row`, `.trends-record-outcome`,
      `.trends-record-date`, `.trends-record-score`,
      `.trends-record-sep`, `.trends-record-locus`,
      `.trends-record-composite`, `.trends-record-composite-value`,
      plus the data-outcome color rules.
    - Mention row classes: `.trends-mention-row`,
      `.trends-mention-name`, `.trends-mention-count`.

### Profile route

`src/routes/profile.tsx`:

- `void getEntities(sport)` removed from `firePreloads`. With
  Mentions disconnected, no other surface reads the bundled entities
  JSON via the `getEntities` query (the entity-data-store path used
  by SearchBar / CompareCard is a different API — still warms via
  its own machinery).
- Header comment updated to explain the disconnection so a future
  reader sees why the preload line is gone.
- `getEntities` import retired.

### Files / fetchers left intact (revival-ready)

- `src/lib/data/team-results.server.ts` — still wired; no current
  consumer. Endpoint unused on the frontend until Record returns.
- `src/lib/data/entities.ts` — still wired; SearchBar / CompareCard
  use `entityDataStore` directly so this query has no consumer
  today.
- `src/lib/utils/co-mentions.ts` + its test — preserved as the
  matcher utility.
- `src/lib/utils/stats-categorizer.ts` — heavy lifter for StatsCard
  and CompareCard's pizza charts; only the `getStatLabel` /
  `LOWER_IS_BETTER` consumers inside TrendsCard went away.

Reviving any of the dropped sections is a paste-back from git
history at this commit's parent — the underlying data layer is
untouched.

## Files Changed

- `src/components/solid/TrendsCard.tsx` (rewritten, 735 → 330 lines)
- `src/components/solid/TrendsCard.css` (rewritten, 410 → 173 lines)
- `src/routes/profile.tsx` (drop entities preload + import)

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- `grep` sweep across `src/` for `trends-stat-` / `trends-record-` /
  `trends-mention-` / orphaned vibe-row classes — no remaining refs.
- UI not opened in the browser this commit. Trends now shows only
  the two sparklines + a divider; the Card's overall vertical
  footprint drops by ~60-70% on profiles that previously rendered
  all five sections.

## Result

TrendsCard is now what its name promises — a trend-shape surface.
Two sparklines, one composite rating and one vibe trajectory, both
spanning the same season window with matching geometry. No
secondary noise competing for attention; no per-game / per-stat /
per-mention rows costing render or fetch budget for content the
sparklines already summarize in a glance.
