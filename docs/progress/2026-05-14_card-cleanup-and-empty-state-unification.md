# 2026-05-14 — Card cleanup + News empty-state unification

## Goal

Round-2 polish on the profile cards. Strip noise from the Stats card so the
pizza chart is the single canonical data view; tighten the global search
dropdown so its meta line is actually useful; fix a hover-overlap bug in
side-by-side Compare; rename the News-tab card to reflect what it actually
is; and unify all News-mode empty states behind one tarot-deck-back card.

## What Was Done

**Stats card → charts only.** Removed the per-game / shooting / activity
box-score number grid (every value it shipped already appears on a pizza
slice), the home/away `<details>` block (orthogonal to "stats" — moves
out of scope here), and the W/L/D momentum strip (same reasoning).
`getBoxScoreGroups`, `categorizeStats`, `parseFormBadges`, the
`HomeAwayStat` interface, the `getHomeAwayDefs` helper, and all matching
CSS rules went with them. The card now renders exactly: rate toggle →
scope toggle → pizza-chart grid. Skeleton dropped its box-score
placeholder.

**SearchBar dropdown meta rework.** Below the entity name:
- Players: `${team} - ${capitalize(position)}` using `positionGroup`
  for the readable label, falling back to the raw position code. E.g.
  "Chelsea - Midfielder".
- Teams: `conference || league.name` from `TeamMeta` — empty if neither
  is loaded yet.

The team-meta JSON isn't part of the autocomplete bundle, so meta is
lazily warmed on first focus per sport (one-time ~290 KB–1 MB fetch).
A `metaTick` signal flips when `loadMeta()` resolves so the dropdown
re-evaluates and team conferences pop in shortly after the user starts
typing. The right-side pill now shows entity type (Player / Team)
instead of sport — the search is already sport-scoped via
`$currentSport`, so the sport pill was redundant.

**Team traits no longer include games/matches played.** New
`TEAM_TRAIT_BLOCKLIST` set in `TraitsTab` skips `games_played` and
`matches_played` for `type === "team"`. Stays a strength for players —
the greatest ability is availability.

**Compare side-by-side hover no longer collides.** Each
`.compare-chart-cell` is now its own stacking context; `:has(.pizza-slice.is-hovered)`
lifts the hovered cell's `z-index`. Pair `gap` bumped 0.5rem → 1.5rem
so labels physically have room. And a `:has(...)` rule dims the
sibling cell's outer labels (`opacity: 0.15`) when one chart has a
hovered slice — in-slice percentile numbers untouched.

**`NewsTab` → `ArticlesCard`.** `git mv` to preserve history. Exports
renamed to `ArticlesCard` + `ArticlesCardSkeleton`; `ContentShell`
import + pane mapping updated; comments in `XTab` and `CoMentionsTab`
that referenced `NewsTab` / `NewsCard` updated.

**Shared `<EmptyTabCard>`.** Extracted the Vibes null-state (tarot
deck-back illustration + italic "watching for mentions" copy) into a
shared `EmptyTabCard.tsx` + `EmptyTabCard.css`, optional `message`
prop. Now used by `ArticlesCard` (no articles), `XTab` (both the
"X integration is not configured" and "no recent tweets" branches),
and `VibeCard` (empty corpus). Dropped the local `NullCard` function
from VibeCard and removed the dead `.vibe-card-null` / `.vibe-deck-back`
CSS rules.

## Files Changed

- `src/components/solid/StatsTab.tsx` — strip box-score / home-away /
  momentum render + helpers + skeleton slot.
- `src/components/solid/StatsTab.css` — drop box-score, momentum,
  home-away, split-stat rule blocks + mobile overrides.
- `src/components/solid/SearchBar.tsx` — `suggestionDetail` +
  `suggestionTypeLabel` helpers, `metaTick` for reactivity, lazy
  meta-load on first focus, capitalization helper for position.
- `src/components/solid/TraitsTab.tsx` — `TEAM_TRAIT_BLOCKLIST` +
  type-aware `extractTraits`.
- `src/components/solid/CompareTab.css` — `.compare-chart-cell`
  stacking context, `:has()` z-index lift, `gap` 0.5rem → 1.5rem,
  sibling-label dim rule.
- `src/components/solid/EmptyTabCard.tsx` *(new)* — shared empty card.
- `src/components/solid/EmptyTabCard.css` *(new)* — co-located styles.
- `src/components/solid/ArticlesCard.tsx` *(renamed from NewsTab.tsx)*
  — empty branch uses `<EmptyTabCard/>`.
- `src/components/solid/ArticlesCard.css` *(renamed from NewsTab.css)*
  — header comment updated.
- `src/components/solid/XTab.tsx` — both empty branches use
  `<EmptyTabCard/>`; doc comment refers to ContentShell.
- `src/components/solid/VibeCard.tsx` — drop `NullCard`; use
  `<EmptyTabCard/>`; docstring updated.
- `src/components/solid/VibeCard.css` — drop dead null-card rules.
- `src/components/solid/ContentShell.tsx` — import + pane mapping
  follow rename.
- `src/components/solid/CoMentionsTab.tsx` — doc comment refers to
  ArticlesCard.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 92/92 pass (no test changes; the box-score helpers
  removed from StatsTab still have a `stats-categorizer.test.ts`
  green, since the helpers themselves stay in the categorizer
  module).
- `npm run dev` — Vite boots clean; profile SSR returns 200 for NBA
  player, NBA team, and Football team URLs.
- Live click-through: Stats card now renders charts only, end of
  story. Compare hover: hovered chart's enlarged label reads cleanly
  with the sibling's labels dimmed. SearchBar dropdown: player rows
  show "Team - Position" capitalized, team rows show conference / league
  once meta lands, right pill shows Player / Team. Empty News, X, and
  Vibes panes all render the same tarot deck-back card.

## Result

The Stats card has one job and does it. Compare hover stops fighting its
neighbor. The search dropdown carries genuinely useful info instead of a
redundant sport badge. And the News-mode empty states stop reading like
three different products bolted together — one card, one voice.
