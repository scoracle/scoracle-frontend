# 2026-07-03 — Aesthetic alignment: real webfonts, vector brand marks, role cleanup

## Goal

The site's type and brand marks had drifted scattershot relative to
`../scoracle-tokens/AESTHETIC_VISION.md`. Concretely: no webfonts were loaded
at all (every serif role rendered Georgia; the numeric role was never used
anywhere), the favicon was still the retired Midnight-indigo accent circle,
the AppRail brand button squeezed the full 1378px crystal-ball illustration
PNG into a ~30px smudge, uppercase micro-labels alternated between the body
serif and the UI sans file-by-file, and the 404 page was completely unstyled.

## What Changed

**Typography (with `@scoracle/tokens` 0.6.1):**

- Self-hosted **Fraunces** variable (roman + italic) and **DM Sans** variable
  (latin subsets, ~210 KB total, SIL OFL) in `public/fonts/`, declared via
  `@font-face` in `global.css`, roman cuts preloaded in `entry-server.tsx`.
  The token stacks (`--font-display/heading/body` → Fraunces,
  `--font-numeric` → DM Sans) come from tokens v0.6.1.
- **Micro-label unification:** every uppercase eyebrow/label now uses
  `--font-ui` (the established `.eyebrow` idiom) instead of a per-file coin
  flip between serif and sans: `pw-subtitle`, `pw-score-label`,
  `pw-detail-label`, `lb-blurb`, `lb-metric-label`, `trends-score-label`,
  `trends-spark-label`, `rating-grid-label`, `rating-list-title`,
  `rating-list-head`, `category-chart-label`, `headline-category`,
  `legal-effective`.
- **Numeric role adopted** (it was defined but used nowhere): leaderboard
  rank/metric, profile detail values, rating grid percentiles, ranked-list
  rank/score columns, transfer heat, narrative impact, compare scores, and
  chart percentile annotations now use `--font-numeric`. Large hero scores
  (`pw-score-value`, `vibe-score`, `trends-score-val`, `rating-hero-pct`)
  stay on the display role per the vision's table.
- Chart SVG text (`PizzaChart`, `ButterflyChart`) explicitly uses UI/numeric
  roles — 9–10px annotations no longer inherit the body serif.
- Serif-input drift fixed: `CompareSearch` input/suggestions/pill now use
  `--font-ui` like `SearchBar`. Raw `font-weight: 500/600` literals replaced
  with weight tokens. Home wordmark gets caps tracking (0.045em).

**Brand marks:**

- `favicon.svg` redrawn: ink (`#171717`) linework crystal ball — ball, filled
  four-point sparkle, pedestal — on the cream card (`#EAE5DD`) rounded square.
  Replaces the retired-accent (`#1A1F3A`) circle, which was the pre-v0.4.0
  brand color surviving in the tab bar.
- AppRail brand button: inline `<BrandMark/>` SVG on `currentColor` (same
  stroke language as the rail icons), replacing the downscaled PNG;
  `scoracle_crystal_ball_mark.png` deleted. The detailed illustration stays
  as the home hero.

**Cleanup:**

- Deleted dead `Header.tsx` / `Header.css` (imported nowhere).
- Removed dead `.news-scope*` rules (superseded by the ScopeRail dropdown).
- 404 route styled: legal-page container, centered, on-voice copy, link home.

## Files Changed

`global.css`, `entry-server.tsx`, `package.json`, `public/fonts/*` (new),
`public/favicon.svg`, `AppRail.{tsx,css}`, `routes/{index,leaderboard,legal,
profile}.css`, `routes/[...404].tsx`, `EntityMeta.css`, `StatsCard.css`,
`MomentumCard.css`, `RatingCard.css`, `RatingList.css`, `TransfersCard.css`,
`NewsCard.css`, `CompareSearch.css`, `SearchBar.css`, `PizzaChart.css`,
`ButterflyChart.css`, `AdSlot.css`; deleted `Header.tsx`, `Header.css`,
`scoracle_crystal_ball_mark.png`.

## Verification

- `npm run typecheck` clean; `npm test` 18 files / 127 tests pass.
- `scoracle-tokens` `npm run verify` (build + client audit) passes for web.
- Headless-Chromium screenshots against the locally built tokens package:
  home (Fraunces masthead wordmark, linework rail mark), about/legal
  (editorial Fraunces text), 404 (now on-brand). Favicon checked at
  64/32/16px. Leaderboard/profile data fetches are blocked in this
  environment; their changes are mechanical role swaps covered by the above.

## Result

One type system instead of three accidental ones; the marks are vector, ink,
and on-palette. **Deploy order:** tag/publish `scoracle-tokens v0.6.1`, then
`npm update @scoracle/tokens` here so the published stacks name the
self-hosted families — until then the site keeps Georgia (fonts sit inert,
nothing breaks).

## Follow-Up

- OG/share images still render PT Serif (`public/og/fonts/`,
  `lib/og/build-card.ts`). Consider swapping to Fraunces static instances so
  share artifacts match the live site; verify resvg-wasm renders the
  instanced cuts before switching.
- The `.card::before` weathered-tarot frame "crisp-tarot" follow-up noted in
  `global.css` still stands.
- If Sentient (Fontshare) is licensed into the pipeline later, point
  `--font-body` at it and keep Fraunces for display.
