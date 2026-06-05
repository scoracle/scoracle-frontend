# 2026-06-04 — Trends card: two stacked sparklines + two tier-colored scores

## Goal

Per Scott: the Trends card should show two separate sparklines (General on top, Vibes below),
both the General + Vibe scores at the top, all in the site's dynamic tier colors
(green = good → red = bad).

## What Was Done

- **TrendsCard** reworked from one overlaid chart + single headline to:
  - **Two scores at top** — General (season composite rank) + Vibe (latest daily sentiment),
    each tier-colored via `tierColor(score)`.
  - **Two stacked sparklines** — General (per-event composite %) then Vibe (per-day sentiment),
    each its own independent 0-100 box with a caps label + date axis. Line + dots are
    tier-colored from the matching score (so a poor season reads red, a strong one green).
  - Replaced the single shared-axis `chart` memo with a reusable `buildSpark(rows, W, H)` +
    per-series `generalSpark` / `vibeSpark` memos.
- **TrendsCard.css** rebuilt for the new structure (`.trends-scores` / `.trends-score*` /
  `.trends-spark*`); dropped the dead fixed-color line/dot/legend/headline classes — colors
  are now inline (dynamic).

## Files Changed

`components/solid/TrendsCard.tsx`, `components/solid/TrendsCard.css`.

## Verification

`npm run typecheck` clean; `npm test` 97/97. Local render: two scores (General 16 → red,
Vibe 52 → gold) over two stacked sparklines (General red, Vibe gold), each labeled + dated.

## Result

The Trends card reads as two clean season sparklines with their scores up top, fully in the
green→red tier palette — consistent with the rest of the site.
