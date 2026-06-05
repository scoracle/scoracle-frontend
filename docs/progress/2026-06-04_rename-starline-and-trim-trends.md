# 2026-06-04 — Rename "starline" → sparkline/trends + trim Trends to two lines

## Goal

(1) Kill the misspelled "starline" — `sparkline` for non-client code, **Trends** for the
client-facing card. (2) Restore the Trends card to its original clean two-sparkline form:
composite (current season + season toggle) + vibes (as far back as data goes). No "Special".

## What Was Done

**Rename (1):**
- Data layer: `getStarline`→`getSparkline`, `starline.server.ts`→`sparkline.server.ts`,
  `Starline{Response,Rating,Event}`→`Sparkline*`, `starlineUrl`→`sparklineUrl`, query key
  `"starline"`→`"sparkline"`, all local `starline` vars → `sparkline`. (Used by Composite /
  Specialist / Trends / EntityMeta / ContentShell / Leaderboard.)
- Card identity: tab/CardId `"starline"`→`"trends"`, label "Starline"→"Trends" (registry +
  ProfileTab union + ShareTab + CARD_META + OG_BODIES). Old links still work:
  `deriveInitialTab` aliases `starline`→`trends`; `OG_BODIES.starline` aliases to the trends body.
- The API **path** stays `/starline` (live backend route) — the only remaining "starline",
  flagged in `data-sources.ts`. Renaming the backend endpoint to `/sparkline` is a separate
  coordinated change (new route + `/starline` alias during rollout).

**Trim Trends (2):**
- `TrendsCard` drops the Specialist line, dots, legend item, and the specialty label →
  two sparklines: Composite (General/Rating) + Vibes. `ratingEvents` no longer requires a
  specialist pct. Headline aria no longer string-matches "Rating".

## Files Changed

~18 files (data layer, card-registry, card-meta, og-bodies, contexts/profile, share-url,
profile-tabs(+test), share-url.test, data-sources, og handler, TrendsCard, EntityMeta,
ContentShell, Composite/Specialist/Leaderboard cards).

## Verification

`npm run typecheck` clean; `npm test` 97/97. Local browser render of `?tab=trends`: composite
+ vibe lines only (no specialist line/label), legend = [General, Vibe]. Post-deploy: blank-
profile race-loop stays 0% + `/og/trends/...` renders + `/og/starline/...` alias still resolves.

## Result

"starline" is gone from the frontend (except the flagged live API path); the card is "Trends"
client-side, "sparkline" in code. Trends is back to a clean two-line composite + vibe season view.
