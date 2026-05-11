# v2 chrome — Soft sand frame + StatsTab line-quiet + uniform search inputs

**Date:** 2026-05-10
**Scope:** Three paired refinements after the *Warm slate frame + feed rows line-quiet* pass earlier today: (1) chrome stroke + corner numerals settle on Soft sand (the eyebrow/smallest-label color) — chrome should support, not compete; (2) StatsTab category dividers (between ATTACK / POSSESSION / DEFENSE / etc.) stripped to extend the line-quiet rule into stats; (3) CompareSearch input background unified with the home SearchBar.

## Goal

User feedback after seeing Warm slate + the previous line-quiet pass:

> The current plan is on brand, but detracts a little from the content. Let's change it to our third text color.

> [Re StatsTab] We have these lines between the categories still. Remove it. Makes it look cluttered versus the straightforward contents-on-card we want.

> [Re CompareSearch] Change the color of the compare box outline to the same color as the search box on the home page (keeps search boxes uniform).

The chrome iteration converged on Soft sand (`var(--text-tertiary)` `#8A7A5C`) — same color the brand uses for eyebrows / smallest labels. With the lightened Bone surface, this recedes far enough to support content without becoming invisible. The StatsTab "exception" I documented in the previous pass turned out to be wrong: the category dividers ARE decorative chrome, not functional table separators. Stripping them aligns the entire ContentShell with the line-quiet rule. CompareSearch's darker `var(--bg)` background was producing a different visual weight from the home SearchBar's `var(--bg-card)` background — switching CompareSearch to match unifies the search input identity.

## What Was Done

### Frame stroke + corner numerals: Warm slate → Soft sand

`src/global.css` — `.card::before` border color: `var(--text-secondary)` (Warm slate) → `var(--text-tertiary)` (Soft sand).

`src/components/solid/EntityMeta.css` — `.meta-corner-num` color: `var(--text-secondary)` → `var(--text-tertiary)`.

`src/components/solid/VibeCard.css` — `.vibe-corner-num` color: `var(--text-secondary)` → `var(--text-tertiary)`.

The frame and corner numerals now share the eyebrow color. Reading from foreground to background: primary text (Smoke) > subtext (Warm slate) > eyebrows + chrome + corner numerals (Soft sand) > borders (Faded sand). The chrome layer is a clear step softer than even the subtext layer — it supports without competing.

### StatsTab category dividers stripped

`src/components/solid/StatsTab.css`:

- `.stats-charts-container { border-bottom }` removed (the line under the entire pizza-chart section).
- `.stats-charts-grid .category-chart { border-bottom }` removed (the lines BETWEEN categories — what the user explicitly called out).
- `.stats-charts-grid .category-chart:last-child` override removed (no longer needed).
- `.stats-charts-grid` gained `gap: 1.5rem` (was `gap: 0`) so categories still have visual breathing room.
- `.momentum-section { border-top }` removed (the line above the momentum/form section).

**What stays:** `.home-away-section { border: 1px solid var(--border) }` (the outer outline of the expandable accordion box) and `.home-away-content { border-top }` (the divider inside the accordion between summary and content). These are *functional container outlines*, not decorative row separators — chrome on discrete UI elements with defined boundaries. The line-quiet rule is *no decorative row separators*, not *no borders anywhere*.

### CompareSearch input — background unified with SearchBar

`src/components/solid/CompareSearch.css` — `.compare-search-input` background: `var(--bg)` (Page) → `var(--bg-card)` (Bone). Now matches the home SearchBar input. Border, radius, and other styling were already aligned from earlier passes; this completes the visual parity.

The two search inputs are still sized differently (SearchBar is the home-page hero — bigger padding, bigger font, centered text; CompareSearch is the in-card secondary — smaller padding, left-aligned). That's intentional. The *background* + *border* identity is what's unified now — they read as the same brand input pattern, sized for context.

## Files Changed

**Modified:**
- `src/global.css` — `.card::before` border `var(--text-secondary)` → `var(--text-tertiary)`
- `src/components/solid/EntityMeta.css` — `.meta-corner-num` color `var(--text-secondary)` → `var(--text-tertiary)`
- `src/components/solid/VibeCard.css` — `.vibe-corner-num` color `var(--text-secondary)` → `var(--text-tertiary)`
- `src/components/solid/StatsTab.css` — `.stats-charts-container` lost `border-bottom`; `.stats-charts-grid .category-chart` lost `border-bottom` + `:last-child` override; `.stats-charts-grid` gained `gap: 1.5rem`; `.momentum-section` lost `border-top`
- `src/components/solid/CompareSearch.css` — `.compare-search-input` background `var(--bg)` → `var(--bg-card)`

**Vault:**
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — *Card silhouette* updated (Soft sand for stroke + numerals); *ContentShell stays line-quiet* sub-section's StatsTab "exception" note retracted; replaced with a *functional container outline* exception that's tighter and more defensible
- `~/.claude/.../memory/project_aesthetic_v2.md` — same refinements
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-10_v2-stats-cleanup-and-soft-sand-frame.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row

## Verification

```bash
npx tsc --noEmit       # passes
npx vitest run         # 92 tests pass
```

Browser-side smoke after dev reload:
- Frame + corner numerals read as quiet supporting chrome (Soft sand) — content takes the foreground.
- Stats tab: pizza charts separated by whitespace gap, no horizontal lines between ATTACK / POSSESSION / DEFENSE etc.
- CompareSearch input has the same Bone background as the home SearchBar — visually uniform across both search surfaces.
- Home/Away accordion section in StatsTab still has its outer outline + accordion summary/content separator (correct — functional UI chrome, not decorative).

## Result

v2 chrome iteration converges on its final form for current scope:

| Layer | Treatment |
|---|---|
| Outer Card silhouette | 6px rounded corners |
| Interior inset stroke | 1px **Soft sand** (`var(--text-tertiary)`) at `inset: 6px` |
| Corner numerals | Italic Georgia, **Soft sand**, top-left + rotated bottom-right |
| Card surface | Bone `#FAF3E3` |
| Card lift | Two-layer paper-on-desk shadow at low opacity |
| Page surround | `#E5DAC4` |
| ContentShell internals | **No decorative row dividers anywhere** — outer frame + active fills + gap-spacing carry structure |
| Functional container outlines | Stay (accordion box, search input chrome, etc.) — discrete UI element boundaries |
| Search inputs | Uniform Bone background + Faded sand border across SearchBar (home) and CompareSearch (in-card) |

## Implications + carry-forwards

- **Brand chrome reading order is now clean.** Foreground (Smoke text) → middle (Warm slate subtext) → support (Soft sand eyebrows + chrome + corner numerals) → background (Faded sand borders, Bone surfaces). Each tier serves a distinct hierarchical role.
- **The StatsTab "exception" I documented earlier was wrong** — category dividers were decorative, not functional. The corrected exception is *functional container outlines* (accordion box, input chrome) — those stay because they outline discrete UI elements with defined behavioral boundaries, not because they separate items in a list.
- **Search inputs are now a unified pattern.** Future Cards needing a search input (e.g., a future filter chip search inside StatsTab, a TraitsTab compare-by-trait search) inherit the Bone-bg + Faded-sand-border + 2px-radius shape. Sized per-context, identity per-brand.
- **Brand chrome anatomy is fully stable for current scope.** No more iteration expected on stroke color, corner numeral color, or row dividers. Phase 4 (Share Frame) and Phase 5 (backend coord) can move forward without further chrome refinement.

## Related

- `~/scoracle-frontend/docs/progress/2026-05-10_v2-warm-slate-and-feed-quiet.md` — previous iteration; settled chrome on Warm slate + cleared feed-row dividers (this pass dials chrome lighter and cleans stats too)
- `~/scoracle-frontend/docs/progress/2026-05-10_v2-playing-card-shell.md` — earlier today; rounded outer + lighter Bone (companion tokens v0.3.2)
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — locked card silhouette + extended line-quiet rule + functional-container-outline exception
