# 2026-06-07 — Share OG bodies: bespoke sparkline (#18) + leaderboard snapshot (#16)

## Goal

Two share-card artifacts: (#18) replace the Trends/sparkline card's interim Meta-fallback OG
with a real two-sparkline body; (#16) make the `/leaderboard` page shareable with a top-N
snapshot OG body.

## What Was Done

### #18 — bespoke sparkline OG body
- `lib/cards/bodies/sparkline.ts` (`sparklineBodySvg`): two tier-colored scores (General/Rating
  + Vibe) over two stacked sparklines (per-event composite line + daily vibe line), pure SVG in
  the 800×800 body box — the share twin of the in-app TrendsCard.
- `og-bodies.ts`: `trendsBody(ctx)` reads `getSparkline` (composite events) + `getTrends`
  (daily vibe series); falls to `metaBody` when neither series has data. Wired
  `trends`/`starline` → `trendsBody` (were `metaBody`).

### #16 — leaderboard top-N snapshot OG + shareable
- `lib/cards/bodies/leaderboard.ts` (`leaderboardBodySvg`): ranked top-10 list (rank · name ·
  tier-colored metric).
- `og-bodies.ts`: `leaderboardBody(ctx)` — URL convention `/og/leaderboard/{sport}/{type}/{board}`
  (`type`=entity_type, `id`=board: composite/vibes/news/transfers). Fetches the right board and
  maps to rows; returns a body **plus a `header` title block** (new optional `OgBody.header`).
- OG route handler: when there's no entity (`getOgEntityFacts` returns null for a board), it uses
  `resolved.header` as the centered title — keeps the handler generic.
- `/leaderboard` page: `og:image`/`og:*` Meta → the snapshot URL; a "Share" button (`shareCard`
  + `ShareFallbackModal`) shares the canonical board URL. `CARD_META.leaderboard.shareable = true`.

## Files Changed

`lib/cards/bodies/sparkline.ts` (new), `lib/cards/bodies/leaderboard.ts` (new),
`lib/cards/og-bodies.ts`, `routes/og/[cardType]/[sport]/[type]/[id].ts`, `lib/cards/card-meta.ts`,
`routes/leaderboard.tsx`, `routes/leaderboard.css`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker: `/og/trends/nba/player/56677822` →
200 image/png (Wembanyama: General 100 + Vibe 78 + two sparklines); `/og/leaderboard/football/player/transfers`
and `/og/leaderboard/nba/player/composite` → 200 image/png (top-10, tier-colored metrics).
`/leaderboard` page carries the `og:image` meta + Share button.

## Result

Trends shares render the real season chart; the leaderboard is shareable with a clean top-N
snapshot. #20 ("Penalties Won → display-only") is closed — already resolved display-side by the
Specialist filter; the backend engine demote rides with #22.

## Deferred (tracked)

#17 (in-app Canvas convergence), #22 (football engine recompute — position-aware datapoints),
#23 (per-36/per-90 + position scopes). See `docs/progress/2026-06-07_deferred-tasks-handoff.md`.
