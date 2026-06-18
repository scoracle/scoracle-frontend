# Trending leaderboard board + Momentum→Trends label

**Date:** 2026-06-18
**Scope:** New Trending board (vibe/rating risers) + surface "momentum" as "Trends".
**Commit:** `b38c514` — origin/main. Deployed (Worker `500dbcb4`).

## What Was Done

- **Trending board** on `/leaderboard`: rail is now Rating · News · Vibe · **Trending** · Transfers.
  Ranks the RISERS — the recent rise (+N) of an entity's trajectory — with a **Vibe risers / Rating
  risers** scope toggle (`?metric=`). New `getTrendingLeaderboard` fetcher + `TrendingLeader` type +
  `trendingLeaderboardUrl` + `METRIC_OPTIONS` Select (shown only on Trending). Risers shown green (+N).
- **Momentum → "Trends":** `pillarLabel("momentum")` + the registry label now return **"Trends"**; the
  `momentum` id, `MomentumCard` component, and `/momentum` endpoint stay (under-the-hood). The card
  chrome already read "Trends".

## Verification

- tsc clean · 113 tests · build OK · deployed.
- Live (scoracle.com): leaderboard rail Rating · News · Vibe · Trending · Trades; `?board=trending`
  shows risers with the Vibe/Rating toggle; profile tab reads **"Trends"** (not "Momentum").
  API: trending vibe (Jalen Green +60) + rating (Jaden McDaniels +92).

## Result

The leaderboard now has the four discovery boards + the Trending risers board; "momentum" is fully an
under-the-hood term surfaced as "Trends". Symmetric: the profile Trends card shows one entity's
trajectory; the Trending board ranks who's rising fastest.
