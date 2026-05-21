# 2026-05-20 — Shell rewrite + NavStrip primitive + Phase D + antique tarot orientation

## Goal

Re-anchor the platform's card system around three honest decisions
agreed during this session's deep-dive into the `<Shell>` primitive:

1. **Shell owns silhouette + padding absolutely.** No Card-side overrides.
   The "uniform appearance" promise becomes a genuine contract.
2. **NavStrip is its own primitive.** A thin nav strip is not a card;
   it doesn't wear card chrome. Adds an `inline` variant so secondary
   toolbars (rate + scope toggles) can compose multiple NavStrips into
   one shared row.
3. **One chart per card.** StatsCard and CompareCard split each chart
   category into its own locked Shell (Phase D, planned in
   `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md` and
   shipped here). Each chart becomes a focal point with breathing room
   around it.

And one design pivot the user landed mid-session:

4. **Card dimensions switch to antique tarot (4.125" × 5.875").** Cards
   are now portrait on mobile, landscape on desktop, via a single
   `@media` breakpoint that flips the CSS variables driving width and
   aspect. Same canonical dimensions, just rotated to match the natural
   reading flow per viewport.

## What Was Done

### 1. Shell — locked contract (`src/components/solid/Shell.tsx` + `src/global.css`)

- Removed the `unlockHeight` prop. Every Shell now uses the same
  canonical silhouette; cards can't opt out of the brand shape.
- Replaced `aspect-ratio: 19/11` with `min-height: calc(var(--card-width)
  * var(--card-aspect-num) / var(--card-aspect-den))`. Chrome's
  `aspect-ratio` with `width: 100%` was acting as a *hard cap* on height,
  not a preference — content taller than canonical was painting OUTSIDE
  the Shell bounds. `min-height` keeps canonical as the floor and lets
  content push the box taller when needed.
- Added `display: flex; flex-direction: column; justify-content: center`
  to the Shell so short content centers vertically inside the canonical
  silhouette rather than hugging the top edge.
- Locked the padding contract: `1.25rem 1.5rem` at the Shell level,
  never overridden by Cards. Removed all per-Card padding overrides:
  - `EntityMeta.css` — dropped `.meta-widget { padding: 0 }` and the
    inner `.pw-body { padding: 1.5rem }` workaround.
  - `TraitsCard.css` — dropped `.sw-body { padding: 1rem 1.5rem 1.25rem }`
    and its mobile breakpoint overrides.
  - `VibeCard.css` — dropped the inner `.vibe-card` `padding: 1.5rem 1.25rem`
    (was stacking on top of Shell's padding, giving 44px sides).
- Doc-honesty pass on the Shell docblock — now describes the
  locked-padding + always-canonical-silhouette contract truthfully.
- Drift fix: `VibeCard.css` comment said "Lives inside its own locked
  `<Shell>` (380×320)" — updated to "600×348" then later "antique
  tarot" once the dimensions pivoted.

### 2. NavStrip primitive (`src/components/solid/NavStrip.tsx` + `.css`)

- `git mv NavTabs.{tsx,css} → NavStrip.{tsx,css}`. Renamed class names
  `nav-tabs*` → `nav-strip*`.
- Rebuilt the visual: **all labels in display-font italic** (Georgia
  italic — same voice as VibeCard score, EntityMeta name). Active
  state = `color: var(--text)` + 2px Smoke rule under the active label
  only. Bottom hairline rule (1px Smoke at 10% opacity) anchors the
  strip as a navigation surface without making it a card. No background
  fill anywhere — no SaaS pill chrome.
- Added an `inline` boolean prop. Inline mode drops the strip-level
  chrome (width cap, vertical padding, bottom hairline) so multiple
  NavStrips can compose into a single parent toolbar that draws the
  shared hairline. Inline-mode labels are also rendered fractionally
  smaller (`0.875rem` vs the standalone `1rem`) so secondary controls
  sit a notch below the primary nav in visual hierarchy.
- Updated all consumers:
  - `ContentShell.tsx` — dropped the `<Shell as="nav" unlockHeight>`
    wrapper that used to chrome the profile nav strip. Renders
    `<NavStrip>` directly.
  - `routes/index.tsx` — dropped the `<Shell unlockHeight
    class="home-search-shell">` wrapper around the home page sport row
    + SearchBar. Now they render as two separate elements on the page
    background. Home search bar width matches NavStrip
    (`max-width: var(--card-width)`) for a clean aligned column.
  - `StatsCard.tsx` / `CompareCard.tsx` / `TraitsCard.tsx` — the rate
    (Per Game / Per 90) and scope (All FOOTBALL / specific league)
    toggles all use `<NavStrip inline>` inside a `.stats-toolbar`
    parent that draws the shared bottom hairline + a thin 1px vertical
    divider between the rate and scope groups.

### 3. Phase D — one chart per card (`StatsCard.tsx` + `CompareCard.tsx`)

- Outer container becomes a borderless `<section>`. Each chart
  category with `chartStats.length >= 2` renders as its own locked
  `<Shell>` with a single centered chart inside. Categories with no
  chart-able data are SKIPPED — no empty cards, no "No data"
  placeholders cluttering the stack.
- Typical layouts:
  - Football player (no setpiece data): 4 cards (Attack /
    Possession / Defense / Discipline).
  - Football team / NBA / NFL with full data: 5 cards including
    Set Pieces.
- CompareCard mirror: each card holds the entity pair stacked
  vertically (primary chart above compare chart) inside one chart slot.
- TraitsCard restructured the same way — scope NavStrip moved
  OUTSIDE the Shell into its own `<section class="traits-card">`
  toolbar, matching StatsCard / CompareCard's structural pattern.
- Pizza chart sizing: `width=400, height=360, outerRadius=130,
  labelOffset=22`. viewBox padded past the label-extent radius so
  even the widest stat labels stay inside the SVG box and the chart
  reads as horizontally centered.

### 4. Antique tarot dimensions + responsive orientation flip

- Pivoted canonical card from "real playing card 2.75 × 4.75"
  (landscape 19:11) to **antique tarot 4.125 × 5.875** in
  `src/global.css`.
- Two CSS aspect variables (`--card-aspect-num`, `--card-aspect-den`)
  control orientation. Mobile defaults to portrait (47:33); a
  `@media (min-width: 768px)` flip on `:root` switches to landscape
  (33:47) and widens `--card-width` from 480 → 684. Every Shell on
  the page rotates in unison because they all derive dimensions from
  these variables.
- Mobile sub-breakpoint at 540px scales the canonical floor to
  viewport-relative so the aspect holds visually as the Shell narrows.

### 5. PizzaChart hit-area fix

- Fixed hover oscillation on high-percentile slices. The transparent
  hit-area path's outer radius now includes the hover `radiusBoost`
  so that when a slice's visible arc grows out (up to +40px on intense
  hover), the hit area still covers the boosted slice. Before this
  fix, the cursor sitting at the edge of a 100%-percentile hovered
  slice would fall outside the hit area, fire mouseLeave, snap the
  slice back to its base radius, then re-trigger mouseEnter — visible
  flicker on Set Pieces cards where Corners or similar metrics top
  out at 100%.
- Also explicit horizontal centering on the SVG (`display: block;
  width: ${props.width}px; max-width: 100%; margin: 0 auto`) — flex
  `justify-content: center` on the parent was unreliable when the SVG
  was sized via `width: 100%` (it swallowed the available flex space).

### 6. Misc

- Dropped `unlockHeight` from all 11 consumers (ArticlesCard, XCard,
  TraitsCard, StatsCard, CompareCard, ContentShell, home `index.tsx`,
  and the skeleton variants of each).
- Updated docblocks throughout to describe the new contract.
- All `nav-tabs*` → `nav-strip*` references in docblocks of consumer
  files swept clean.

## Files Changed

```
src/components/solid/Shell.tsx                 # API: drop unlockHeight; docblock rewrite
src/global.css                                  # min-height contract; tarot orientation flip
src/components/solid/NavStrip.tsx              # renamed; inline prop; docblock
src/components/solid/NavStrip.css              # Variant A visual + inline mode
src/components/solid/EntityMeta.css            # padding override removed
src/components/solid/VibeCard.css              # padding override removed; drift comment fix
src/components/solid/VibeCard.tsx              # docblock cleanup
src/components/solid/TraitsCard.tsx            # scope NavStrip outside Shell; layout container
src/components/solid/TraitsCard.css            # .traits-card container; padding overrides gone
src/components/solid/ArticlesCard.tsx          # drop unlockHeight
src/components/solid/XCard.tsx                 # drop unlockHeight
src/components/solid/StatsCard.tsx             # Phase D: one chart per card; NavStrip toolbar
src/components/solid/StatsCard.css             # .stats-card container; .stats-toolbar
src/components/solid/CompareCard.tsx           # Phase D mirror; NavStrip toolbar
src/components/solid/CompareCard.css           # .compare-card container; stacked-pair chart cell
src/components/solid/ContentShell.tsx          # drop Shell wrapper around NavStrip
src/components/solid/PizzaChart.tsx            # SVG centering + hit-area fix
src/components/solid/PizzaChart.css            # display:block, margin:0 auto on SVG
src/components/solid/CrystalBall.tsx           # NavTabs → NavStrip docblock refs
src/contexts/profile.ts                        # NavTabs → NavStrip docblock refs
src/routes/profile.tsx                         # NavTabs → NavStrip docblock refs
src/routes/index.tsx                           # drop Shell wrapper around sport-row + SearchBar
src/routes/index.css                           # .home-search width matches NavStrip
docs/progress/2026-05-20_shell-rewrite-antique-tarot.md  # this doc, NEW
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 110/110 pass.
- Visual sweep on dev server at 1280×900 (desktop landscape) and
  390×844 (mobile portrait):
  - Every Card has a consistent silhouette and uniform 24px sides /
    20px vertical interior padding. No drift between cards.
  - VibeCard, EntityMeta, EmptyCard render the canonical silhouette
    with content centered vertically.
  - StatsCard renders 4 (player) or 5 (team) per-category cards, each
    with one chart centered horizontally + vertically.
  - CompareCard mirrors the structure; each chart slot stacks the
    primary chart above the compare chart.
  - Per-Game / Per-90 + scope NavStrips compose into one toolbar row
    above the card stack with a 1px vertical divider between groups.
  - Profile nav and home sport NavStrips render as bare typographic
    surfaces with bottom hairline, no card chrome.
  - Desktop (≥768px) renders cards in landscape (684 × 480); mobile
    flips to portrait (480 × 684) — same antique-tarot dimensions
    rotated.
  - High-percentile slice hover on Set Pieces is stable — no
    flickering.
- CLS measurement on the profile page (Puppeteer + PerformanceObserver,
  re-using the `/tmp/measure-cold.js` script from the earlier MetaShell
  fix session):
  - News default CLS: 0.0
  - Stats CLS: 0.0 (with the typical 4-card player layout matching
    the skeleton)

## Result

Shell is now an honest primitive. Cards drop content into it and the
brand silhouette is right by construction — no padding overrides, no
height-lock escape hatches. NavStrip is a sibling primitive for thin
navigation surfaces. StatsCard reads as a stack of individually
shareable tarot cards (Phase D's original intent), each chart given
room to express itself. The antique tarot orientation flip means the
same dimensions feel native on both phone and desktop.

Three primitives, three honest roles:
- `<Shell>` — locked silhouette, owns chrome + padding + aspect
- `<NavStrip>` — thin nav, standalone or inline-toolbar mode
- `<EmptyCard>` — locked silhouette for sparse / empty states

All three remain extract-ready for `@scoracle/ui` when sandbox lands —
no flagship-specific imports inside any of them.

## Caveats + follow-ups

- **StatsCard skeleton predicts 4 cards** (typical player case). Team
  profiles with all 5 categories populated (e.g., Tottenham with full
  Set Pieces data) get a +1-card layout shift on first activation —
  roughly 700px of growth when the resolved 5th card mounts. Real CLS
  source, but the magnitude is acceptable per Core Web Vitals on the
  player-default case. Bump to a 5-card skeleton if team profiles
  become the dominant traffic.
- **Per-category share buttons** — Phase D's original spec mentioned
  per-category share, but `lib/share/` doesn't yet have per-category
  share metadata. Wire when that lands.
- **Vault sweep** — minor drift in other progress docs / wiki notes
  about Shell's old contract; handle as encountered.
