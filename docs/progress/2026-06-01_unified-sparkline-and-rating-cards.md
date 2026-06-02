# 2026-06-01 — Unified 0–100 Trends sparkline + Leaderboard & Roster cards

## Goal

Clean up the rating surfaces into a base to build on: (1) collapse the Trends
card into ONE 0–100 sparkline showing Composite + Specialist + Vibes together;
(2) add a Leaderboard card and a team-only Roster card.

## What Was Done

**Trends card → one unified 0–100 sparkline.** Replaced the earlier two-chart /
z-score layout with a single larger (336×148) sparkline plotting three 0–100
lines on a shared time axis: Composite (blue `--compare-primary`), Specialist
(green `--percentile-elite`), Vibes (red `--category-scoring`). Composite /
Specialist read the new per-event `rating_*_pct` (starline, backend migration
029); Vibes reads the trends daily series. Headline back to the 0–100 season
composite percentile (`rating_composite_rank`, tier-colored) + specialty; dashed
midline at the 50th pct.

**Leaderboard card** (`Leaders` tab, all entities) — sport board scoped to the
profile's entity type (player/team), top 25 by composite; rows link to each
profile.

**Roster card** (`Roster` tab, **team entities only**) — every rated player on
the team, ranked by Composite + Specialist sum; names link to the player
profile. Team-only gating via a new `showFor` predicate on `ProfileTabSpec`;
`ContentShell` + `firePreloads` both honor it.

## Files Changed

```
src/lib/data/starline.server.ts          (rating_*_pct fields on StarlineEvent)
src/lib/data/roster.server.ts            (NEW — getRoster)
src/lib/utils/data-sources.ts            (rosterUrl)
src/components/solid/TrendsCard.tsx       (rewrite — 3-line 0-100 chart)
src/components/solid/TrendsCard.css       (rewrite)
src/components/solid/LeaderboardCard.tsx  (NEW)
src/components/solid/RosterCard.tsx       (NEW)
src/components/solid/RatingList.css       (NEW — shared ranked-list style)
src/components/solid/profile-tabs.tsx     (showFor + leaderboard/roster entries)
src/components/solid/ContentShell.tsx     (entity-type tab filter)
src/contexts/profile.ts                   (ProfileTab += leaderboard, roster)
src/lib/utils/profile-tabs.ts             (VALID_TABS += leaderboard, roster)
src/routes/profile.tsx                    (firePreloads honors showFor)
```

(`src/lib/data/leaderboard.server.ts` landed in the prior data-layer slice and is
consumed here.)

## Verification

- `tsc --noEmit` clean; `vitest run` 141/141 (incl. the tab-registry guard).
- SSR (`?tab=trends`, Wemby): 3 lines + midline + legend render; headline 100.
- SSR (`?tab=leaderboard`, player): 25 rows (Jokić / Wembanyama / Dončić), links.
- SSR (`?tab=roster`, OKC team): 9 rows (Gilgeous / Holmgren / Hartenstein),
  player links; Roster tab absent on player nav, present on team nav.

## Result

Base in place. **Known follow-ups for tomorrow:** scope toggles (composite /
specialist), leaderboard headline color vs composite-blue, roster column sort,
visual polish on the list cards, and a deep-link guard for `?tab=roster` landing
on a player page.
