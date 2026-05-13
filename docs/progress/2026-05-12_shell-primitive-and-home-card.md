# 2026-05-12 — Shell primitive + home card + profile merge

## Goal

Bring the home page into the same tarot-card brand silhouette as the
profile page. Concrete asks from the UX pass:

1. Wrap the home search in a Shell with sport tabs replacing the
   arrow nav (arrows were not discoverable; users couldn't figure out
   how to interact with the crystal ball).
2. Close the autofill dropdown after a selection so it doesn't read
   as noise after the user has already picked.
3. Restyle the compare-chart overlay — drop the gray annulus + dashed
   arc for a light percentile-tier fill keyed to the compare's tier.
4. Address scalability: every shell on the platform was hand-rolling
   the same `.card` chrome + corner-numeral spans. Collapse into one
   `<Shell>` primitive that watches its child cards for what to put in
   the corner slot.
5. Merge the profile TabShell + ContentShell — separate cards read as
   noise, and the nav card alone felt too slim to be a card.

## What Was Done

**`Shell.tsx` (new) — the brand silhouette primitive.** Owns the
tarot-card chrome (`.shell.card`) plus a card-driven corner slot.
Cards inside a Shell publish their corner content via
`useShell()?.setCornerLabel(value)` in a `createEffect`; Shell
renders the numeral or falls back to the accent-circle dots
automatically. `EntityMeta` (entity ID), `VibeCard` (archetype Roman
numeral) refactored to publish through this. `cornerLabel` /
`setCornerLabel` deleted from `ProfileContext` — the seam is now at
the Shell layer, not the page layer.

`global.css` corner-dot fallback collapsed from per-component
selectors (`.tab-shell::after`, `.content-shell:not(.has-corner-label)::after`)
to one rule: `.shell:not(.has-corner-label)::after`. Adding a new
shell anywhere on the platform now requires no global-CSS changes.

**Home page rewired.** `CrystalBall` lost its arrows + inline
`SearchBar`. It now subscribes to `$currentSport` and snaps its
carousel when external sport changes arrive. Accepts `paused` +
`onInteraction` props; the route owns the inactivity-resume timer.

New `SportTabs.tsx` is a pure tab-row primitive (NBA / NFL /
Football). Sits inside one `<Shell class="home-search-shell">`
together with the SearchBar — single card, not two stacked. The
shell is absolutely positioned internally: tabs at `top: 25%`, search
at `top: 50%` with `transform: translateY(-50%)` on both, so the
search lands exactly at the card's vertical midpoint and the tabs
center between top border and search. Tab + search wrappers share
`width: min(80%, 480px)` so left/right edges align flush.

Sport tab buttons mirror the profile-page News/Stats parent tab
chassis (48px min-height, vertical-heavy padding) with a slightly
larger label (0.8rem vs 0.7rem on profile) since the home tabs are
the page's primary action.

**Autofill closes on selection.** New `closeDropdown()` in `SearchBar`
clears the query + selection + open state and is called from both
Enter-key (`selectEntity`) and mouse-click (`handleSuggestionClick`)
paths. Modifier-clicks (cmd/ctrl/middle) skip the close so
open-in-new-tab still works.

**Profile TabShell folded into ContentShell.** TabShell is now a
tab-row primitive (no Shell wrapper); `ContentShell` renders it at
the top of its own Shell, then the active pane below. Profile route
drops from three cards (Meta / Tab / Content) to two (Meta / merged
nav-content). `routes/profile.css` updated.

**CompareSearch centered.** `.compare-search-row` got
`text-align: center`; `.compare-search` is now `inline-block` with
`width: min(78%, 380px)` so the input no longer crowds the
ContentShell's tarot border. Pill state (inline-flex) inherits the
centering.

**Search input font fix.** `.search-bar-input` was inheriting the
browser's generic sans because no `font-family` was declared. Added
`font-family: var(--font-body)` so home + header SearchBar instances
match the rest of the site (Georgia stack via `@scoracle/tokens`).

**Compare overlay restyle.** `PizzaChart` ComparisonChart dropped the
gray-with-dashed-line vocabulary. Both `compare > primary` (extension
annulus) and `compare < primary` (primary-excess annulus) now render
as a light fill (`fill-opacity: 0.28`, `stroke-opacity: 0.55`) in the
compare's percentile-tier color — green = good, red = bad, etc.
Primary slice is unchanged. `describeArcOnly` import removed.

**Crystal ball scaled ~5%.** `.crystal-logo` max-width
`589 → 560` / `425 → 404` / `272 → 259` across breakpoints with
sport-display boxes scaled to match. `.home-search-shell` margin-top
pulled to `-1.5rem` so the ball + shell still read as one
composition.

## Files Changed

- `src/components/solid/Shell.tsx` (new)
- `src/components/solid/SportTabs.tsx` (new)
- `src/components/solid/SportTabs.css` (new)
- `src/components/solid/CrystalBall.tsx` + `.css` — arrows + SearchBar
  removed, `paused` prop, `$currentSport` subscription, 5% size drop.
- `src/components/solid/SearchBar.tsx` + `.css` — `closeDropdown` on
  selection (both click + Enter), `font-family: var(--font-body)`.
- `src/components/solid/EntityMeta.tsx` + `.css` — wrap in `<Shell>`,
  body publishes `id` via `useShell()`, drop `.meta-corner-num` rules.
- `src/components/solid/TabShell.tsx` + `.css` — Shell wrapper
  removed; now a tab-row primitive.
- `src/components/solid/ContentShell.tsx` + `.css` — renders
  `<TabShell />` + panes inside one Shell.
- `src/components/solid/VibeCard.tsx` — publishes archetype numeral
  via `useShell()` instead of ProfileContext.
- `src/components/solid/CompareSearch.css` — center the input + pill.
- `src/components/solid/PizzaChart.tsx` — compare overlay restyle.
- `src/contexts/profile.ts` — `cornerLabel` / `setCornerLabel` removed.
- `src/routes/profile.tsx` + `.css` — standalone TabShell removed.
- `src/routes/index.tsx` + `.css` — combined home-search-shell layout
  with absolute-positioned tabs + search.
- `src/global.css` — corner-dot fallback generalized to `.shell`.

## Verification

- `tsc --noEmit` clean.
- 92/92 vitest tests pass.
- Home page (`localhost:5173`) — sport tabs drive carousel, search
  centered at card midpoint, autofill closes on click + Enter.
- Profile page (`localhost:5173/profile?sport=NBA&type=player&id=2544`) —
  two cards instead of three; tab nav + content visually unified;
  CompareTab shows the new colored overlay; corner numerals still
  appear on EntityMeta (id) and the VibeCard pane (archetype).

## Result

One Shell primitive backs every shell on the platform; the home and
profile pages share one brand silhouette; the home page is now a
discoverable surface (tabs, not arrows; card, not floating input);
the compare-chart legend is tier-keyed rather than gray noise.
