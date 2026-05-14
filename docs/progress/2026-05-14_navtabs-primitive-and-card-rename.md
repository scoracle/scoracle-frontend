# 2026-05-14 — NavTabs primitive + Card rename normalization

## Goal

Bring the codebase naming in line with the locked Shell → Tab → Card
vocabulary. Three forces converged on this pass:

1. **Three duplicated tab-strip implementations** — `SportTabs` (home
   sport row), `TabShell` parent row (News/Stats), `TabShell` child
   row (News/X/Vibes or Stats/Traits/Compare). Same dark-fill button
   vocabulary, three CSS rule blocks, three Solid components.
2. **`*Tab.tsx` filenames lied about the tier.** Per
   [[Component Hierarchy]] the leaf-tier content units are *Cards*;
   "Tab" is the navigation strip. `StatsTab.tsx`, `TraitsTab.tsx`,
   `CompareTab.tsx`, `XTab.tsx`, `CoMentionsTab.tsx`, `EmptyTabCard.tsx`
   were all Cards mislabelled as Tabs.
3. **Dead code.** `TabContainer.tsx` predated `ContentShell` and has
   zero current consumers.

The structural normalization should pervade across sites — the
vocabulary lock from the wiki finally matches the file tree.

## What Was Done

**`<NavTabs>` primitive added.** One pillar primitive (`NavTabs.tsx` +
`NavTabs.css`), three variants:

- `primary` — full-width split-fill (profile-page parent row: News / Stats).
- `feature` — gapped + bounded width, slightly louder label (home-page
  sport row).
- `sub` — gapped + smaller (in-card child nav).

Generic over a string-id type so the call site keeps narrow unions
(`<NavTabs<NewsSubTab> />`). Pure presentational — the consumer owns
the data binding (nanostore / context / signal). Extract-ready for
`@scoracle/ui`.

**Retired `SportTabs` + `TabShell` + `TabContainer`.** All three
deleted; their three call sites now render `<NavTabs>` directly:

- `routes/index.tsx` — home page sport row uses
  `<NavTabs items={SPORT_NAV_ITEMS} active={sport()} onSelect={handleSportSelect} variant="feature" />`,
  bound directly to the `$currentSport` nanostore.
- `ContentShell.tsx` — renders **two** `<NavTabs>` strips inline: a
  `primary` row for the mode toggle (News/Stats), then a `sub` row
  for the appropriate child items based on `ctx.mode()`. Three CSS
  rule blocks collapsed into one. The profile page goes from a
  three-Shell stack (Meta + TabShell + Content) to a two-Shell stack
  (Meta + Content).

**Renamed every content-unit `*Tab.tsx` → `*Card.tsx` via `git mv`** so
git history follows:

| Old | New |
|---|---|
| `NewsTab.tsx` *(already renamed earlier today)* | `ArticlesCard.tsx` |
| `StatsTab.tsx` | `StatsCard.tsx` |
| `TraitsTab.tsx` | `TraitsCard.tsx` |
| `CompareTab.tsx` | `CompareCard.tsx` |
| `XTab.tsx` | `XCard.tsx` |
| `CoMentionsTab.tsx` | `CoMentionsCard.tsx` |
| `EmptyTabCard.tsx` | `EmptyCard.tsx` |

Renamed every export (`StatsTab` → `StatsCard`, `StatsTabSkeleton` →
`StatsCardSkeleton`, etc.) and every consumer import. Renamed the
shared utility stylesheet `content-tabs.css → content-cards.css` with
`.tab-loading-skeleton → .card-loading` and `.tab-empty-state →
.card-empty`. Renamed `.compare-tab → .compare-card` and
`.empty-tab-card* → .empty-card*` for consistency.

**Stale doc references fixed.** Updated docstrings in
`CrystalBall.tsx`, `contexts/profile.ts`, `routes/profile.tsx`,
`ArticlesCard.tsx`, `XCard.tsx`, plus the `.card` chrome comment in
`global.css` so references to `TabContainer` / `TabShell` /
`SportTabs` / `SportTabShell` / `NewsTab` / `NewsCard` are gone from
the source tree.

**CLAUDE.md (in-repo).** Rewrote the "Tab convention" section as a
"Card convention" section. Updated the Profile-page architecture
description (two-Shell stack, ContentShell renders NavTabs inline,
ProfileCard is gone). Bumped the locked design-principle wording to
say "Card" where it used to say "tab". Refreshed the Vocabulary
table. Test count corrected (67 → 92).

**Wiki (targeted sweep — Glossary + Architecture/{Frontend
Architecture, Component Strategy, Component Hierarchy}).**

- *Glossary.md*: Shell / Tab / Card entries rewritten — Tab is now
  unambiguously the `<NavTabs>` strip. `isActive` render prop entry
  retired in favour of `Sticky-mount panes`. `VibeCard` null-state
  description reflects the shared `<EmptyCard>`.
- *Component Hierarchy.md*: profile diagram updated to the two-Shell
  stack with two inline `<NavTabs>`; codebase-mapping table replaced
  to show the renames complete; "the tab is the unit of reuse" line
  flipped to "the Card is the unit of reuse"; "TabContainer/Tab"
  retired from the `@scoracle/ui` export inventory in favour of
  `NavTabs` + `EmptyCard` + `PizzaChart`.
- *Component Strategy.md*: same renames in the code example, in the
  shared-cache paragraph, and in the primitives bullet list.
- *Frontend Architecture.md*: SSR-patterns block reflects that only
  EntityMeta is `clientOnly` now (Cards read sport/type/id from
  ProfileContext).

## Files Changed

**Deleted (4):**
- `src/components/solid/TabContainer.tsx` + `.css`
- `src/components/solid/TabShell.tsx` + `.css`
- `src/components/solid/SportTabs.tsx` + `.css`

**New (2):**
- `src/components/solid/NavTabs.tsx`
- `src/components/solid/NavTabs.css`

**Renamed via `git mv` (7 pairs):**
- `NewsTab.{tsx,css}` *(earlier today)* → `ArticlesCard.{tsx,css}`
- `StatsTab.{tsx,css}` → `StatsCard.{tsx,css}`
- `TraitsTab.{tsx,css}` → `TraitsCard.{tsx,css}`
- `CompareTab.{tsx,css}` → `CompareCard.{tsx,css}`
- `XTab.{tsx,css}` → `XCard.{tsx,css}`
- `CoMentionsTab.{tsx,css}` → `CoMentionsCard.{tsx,css}`
- `EmptyTabCard.{tsx,css}` → `EmptyCard.{tsx,css}`
- `content-tabs.css` → `content-cards.css`

**Modified (consumers + docs):**
- `src/components/solid/ContentShell.tsx` — two `<NavTabs>` inline +
  PANES table import names.
- `src/routes/index.tsx` — sport `<NavTabs>` + `handleSportSelect`.
- `src/components/solid/CrystalBall.tsx` — docstring + sport-NavTabs refs.
- `src/contexts/profile.ts` — docstring (two-Shell stack).
- `src/routes/profile.tsx` — docstring + `clientOnly` comment.
- `src/global.css` — `.card` chrome comment.
- `CLAUDE.md` — Card convention; two-Shell stack; vocabulary table.
- 4 wiki files in `~/scoracleWiki/wiki/` (Glossary, Component
  Hierarchy, Component Strategy, Frontend Architecture).

## Verification

- `npm run typecheck` — clean.
- `npm test` — 92/92 pass.
- `npm run dev` — Vite boots clean; home SSR 200; profile SSR 200 for
  NBA player and Football team.
- `grep -r "NewsTab\|StatsTab\|TraitsTab\|CompareTab\|XTab\|CoMentionsTab\|EmptyTabCard\|TabContainer\|TabShell\|SportTabs" src/` — empty.

## Result

The vocabulary now matches the file tree:

- **Shell** — chrome primitive (one component, all v2 chrome).
- **NavTabs** — tab-strip primitive (one component, three variants,
  three consumers).
- **Cards** — content units (`*Card.tsx`, all of them).

Three duplicated tab-strip impls collapsed to one. Two retired
components and one orphan deleted. The profile page is a two-Shell
stack now; the home page's sport row, the profile parent toggle, and
the profile sub-row all speak the same `<NavTabs>` API. When
`scoracle-sandbox` or `scoracle-fantasy` lands, the same primitive
covers their nav strips — no new chassis required.
