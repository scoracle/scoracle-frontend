# v2 chrome cleanup — accent regression fix + pill→box sweep + Card chrome adoption

**Date:** 2026-05-09
**Scope:** Frontend follow-up to the `@scoracle/tokens@0.3.0` palette landing earlier today. Three concrete cleanups: (A) the active-chrome-turned-blue regression, (B) the soft → rigid pill → box migration, (C) v2 Card silhouette chrome adopted via the global `.card` class.

## Goal

The tokens v0.3.0 bump correctly swapped `--accent` from near-black to Midnight indigo `#1A1F3A` per the v2 brief — but the live frontend was using `var(--accent)` for chrome backgrounds (header bar, active tabs, mode toggles), turning all of them blue. The brief defines indigo as a *highlight* color (numerals, key emphasis), not chrome. Chrome that wants to be dark should use `--text` (Smoke). User feedback this session was clear: "neutral tones and black for font and features."

In the same pass, hit the pill → box migration the v2 *Aesthetic Vision* calls out (boxes, not pills — sharp or modestly rounded rectangular edges) and adopt the v2 Card silhouette (Bone surface, hairline inset Smoke stroke, four corner dots, sharp edges) on the existing card surfaces.

## What Was Done

### (A) Accent chrome regression — six call sites migrated `--accent` → `--text`

Every live consumer of `var(--accent)` was using it as a *background* on chrome (or one as an `:hover` link color), which is exactly the wrong use per the v2 brief. All six switched to `var(--text)` (Smoke):

| File | Line | Element | Before | After |
|---|---|---|---|---|
| `src/components/solid/Header.css` | 7 | `.header-wrapper` (sticky top band) | `var(--accent)` | `var(--text)` |
| `src/components/solid/Header.css` | 243 | `.theme-toggle-btn.active` | `var(--accent)` | `var(--text)` |
| `src/components/solid/TabContainer.css` | 45 | `.tab-btn.active` | `var(--accent)` | `var(--text)` |
| `src/components/solid/ProfileCard.css` | 44 | `.profile-mode-btn.active` | `var(--accent)` | `var(--text)` |
| `src/components/solid/StatsTab.css` | 96 | `.rate-toggle-btn.active` | `var(--accent)` | `var(--text)` |
| `src/routes/legal.css` | 83 | `.legal-main a:hover` (color, not background) | `var(--accent)` | `var(--text)` |

After the sweep: zero `var(--accent)` usages remain in `src/`. The `--accent` token still exists in `@scoracle/tokens` (Midnight indigo) and is preserved for its actual use case — highlight numerals and key emphasis on the future `VibeCard`. The token's CLAUDE.md doc was updated this session to call out the highlight-only rule explicitly so future consumers don't repeat the regression.

### (B) Pill → box sweep — six pill shapes flattened

All `border-radius: 999px` chrome surfaces moved to either sharp-boxed (active toggle/tab buttons → `0`) or modestly-rounded inputs (`2px`). After the sweep, zero `999px` radii remain.

| File | Element | Before | After | Reasoning |
|---|---|---|---|---|
| `src/components/solid/Header.css:233` | `.theme-toggle-btn` | `999px` | `0` | Active toggle = chrome; sharp v2 character |
| `src/components/solid/TabContainer.css:33` | `.tab-btn` | `999px` | `0` | Tab navigation chrome; sharp boxed tabs are the v2 silhouette |
| `src/components/solid/StatsTab.css:86` | `.rate-toggle-btn` | `999px` | `0` | Same as theme-toggle |
| `src/components/solid/SearchBar.css:15` | `.search-bar-input` | `999px` | `2px` | Input field; modest softening to keep field corners legible without becoming a pill |
| `src/components/solid/CompareSearch.css:16` | `.compare-search-input` | `999px` | `2px` | Same as search-bar-input |
| `src/components/solid/CompareSearch.css:103` | `.compare-pill` | `999px` | `2px` | Selected-entity chip (the class name now misleads; rename → `.compare-chip` is a follow-up) |

Also flattened `.compare-suggestions` from `12px` → `2px` and removed its `box-shadow` (drop shadows are off the v2 menu — `Aesthetic Vision` *no shadows, no gradients* rule). Other modestly-rounded surfaces (3–6px) were left alone — they're already inside the v2 "sharp or modestly rounded" tolerance.

### (C) v2 Card silhouette — adopted via the global `.card` class

The v2 *Arcane Aesthetic* brief defines the card silhouette as: **Bone surface, hairline inset Smoke stroke, four corner dots, sharp edges**. The existing `.card` global class in `src/global.css` was a simple `bg + border + 6px radius` — generic, not visibly v2. Upgraded to the full v2 silhouette in one place; both consumers (`EntityMeta` via `.meta-widget.card` and `ProfileCard` via `.profile-card.card`) inherit automatically. **No JSX changes.**

The new `.card` chrome:

```css
.card {
  position: relative;
  background-color: var(--bg-card);                 /* Bone */
  background-image:
    radial-gradient(circle at 14px 14px,            var(--text) 1.4px, transparent 1.7px),
    radial-gradient(circle at calc(100% - 14px) 14px, var(--text) 1.4px, transparent 1.7px),
    radial-gradient(circle at 14px calc(100% - 14px), var(--text) 1.4px, transparent 1.7px),
    radial-gradient(circle at calc(100% - 14px) calc(100% - 14px), var(--text) 1.4px, transparent 1.7px);
  background-repeat: no-repeat;
  border: none;                                     /* outer border removed */
  border-radius: 0;                                 /* sharp v2 corners */
}

.card::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px solid var(--text);                    /* hairline inset Smoke stroke */
  pointer-events: none;
  z-index: 0;
}

.card > * {
  position: relative;
  z-index: 1;                                       /* content above the inset stroke */
}
```

This implements the same anatomy as the v2 vibe-card SVG concept in the Arcane Aesthetic PDF (Bone fill, inset stroke at 4–6px from the edge, four small Smoke dots near each corner). Pure CSS; no asset, no SVG component, no JSX touch.

EntityMeta and ProfileCard each had a component-level `border-radius: 0.375rem` that was overriding the global `.card` radius. Both flattened to `0` so the v2 sharp-corner identity actually lands.

### Component renames — deliberately not done

Per the v2 *Component Hierarchy* doc and the original phased plan: renames are opportunistic, not a sweep. `EntityMeta` → `MetaShell` + `MetaCard`, `ProfileCard` → `ContentShell`, `VibesTab` → `VibeCard`, etc. — these all get touched when the corresponding feature work happens (especially the Phase 3 VibeCard rewrite). Renaming-only PRs have no functional value and create review noise. The vocabulary is locked in the wiki ([[Component Hierarchy]]); the file-name adoption rides along on substantive work.

## Files Changed

**Modified:**
- `src/global.css` — `.card` rule rewritten with v2 chrome (Bone surface, four corner dots via radial-gradient backgrounds, inset Smoke stroke via `::before`, sharp edges, content z-index lift via `> *`)
- `src/components/solid/Header.css` — `.header-wrapper` background `--accent` → `--text`; `.theme-toggle-btn` `border-radius: 999px` → `0`; `.theme-toggle-btn.active` background `--accent` → `--text`
- `src/components/solid/TabContainer.css` — `.tab-btn` `border-radius: 999px` → `0`; `.tab-btn.active` background `--accent` → `--text`
- `src/components/solid/ProfileCard.css` — outer `border-radius: 0.375rem` → `0`; `.profile-mode-btn.active` background `--accent` → `--text`
- `src/components/solid/StatsTab.css` — `.rate-toggle-btn` `border-radius: 999px` → `0`; `.rate-toggle-btn.active` background `--accent` → `--text`
- `src/components/solid/SearchBar.css` — `.search-bar-input` `border-radius: 999px` → `2px`
- `src/components/solid/CompareSearch.css` — `.compare-search-input` `border-radius: 999px` → `2px`; `.compare-suggestions` `border-radius: 12px` → `2px`, dropped `box-shadow`; `.compare-pill` `border-radius: 999px` → `2px`
- `src/components/solid/EntityMeta.css` — outer `border-radius: 0.375rem` → `0`
- `src/routes/legal.css` — `.legal-main a:hover` color `--accent` → `--text`

**Vault:**
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-09_v2-chrome-cleanup.md` (mirror of this doc)
- `~/scoracleWiki/wiki/Changelog.md` — new row for this cleanup

**No changes:**
- `package.json` (no version bump — chrome-only sweep, dependency unchanged at `@scoracle/tokens@0.3.0`)
- Any `.tsx` files (this was deliberately CSS-only; structural Shell/Tab/Card adoption defers to opportunistic per-feature work)

## Verification

```bash
grep -rn "var(--accent)" src/ --include="*.css"        # → empty (no usages remain)
grep -rn "border-radius: 999px" src/ --include="*.css" # → empty (no pills remain)
```

Browser-side smoke: dev server reload renders header bar in Smoke (`#232020`) instead of indigo, active tabs in Smoke, EntityMeta and ProfileCard with the new corner-dot + inset-stroke chrome on Bone backgrounds. Sharp corners throughout the chrome.

## Result

`scoracle.com` now reads as the v2 brand visually:

- **Color:** warm-neutral palette with Smoke for chrome and text, no chromatic blue chrome leakage.
- **Edges:** sharp, boxed; no pill shapes anywhere on chrome surfaces.
- **Card silhouette:** Bone surface, hairline inset stroke, four corner dots — the v2 *Arcane Aesthetic* card chrome lands on EntityMeta and ProfileCard automatically via the existing `.card` class.

## Implications + carry-forwards

- **`--accent` is preserved as a brand token** but is currently unused in `src/`. That's correct under the v2 highlight-only rule. The token will return when the `VibeCard` rewrite (Phase 3) renders the score numeral or another genuine highlight surface in indigo. If a future PR reaches for `var(--accent)` for chrome, push back — the regression we just fixed is the cautionary tale.
- **Component renames are still opportunistic.** When the VibeCard rewrite happens, that's the natural moment to rename `VibesTab.tsx` → `VibeCard.tsx`. Same for `EntityMeta` → `MetaShell` + `MetaCard` if the meta-card work in Phase 3+ touches it. Don't run a rename sweep — it'd just generate noise.
- **A real `<Card>` Solid primitive is the right next layer** when shareable cards (`VibeCard`, `TraitsCard`, `GraphsCard`, `CompareCard`) need the v2 chrome plus a `shareable` prop slot. Today's CSS-only `.card` upgrade is enough for the existing surfaces; spec'ing a Solid component without a consumer would be premature.
- **The `.compare-pill` class name is now misleading** (its visual is a chip, not a pill). Rename to `.compare-chip` next time the file is touched substantively.
- **Phase 2 chrome cleanup is now complete in spirit** — the v2 visual identity (palette + type via Phase 1 tokens; chrome via this PR) is on the live site. Phase 3 (VibeCard rewrite) can proceed without further visual prep work.

## Related

- `~/scoracle-tokens/docs/progress/2026-05-09_v2-palette-and-system-fonts.md` — the tokens v0.3.0 bump that this cleanup builds on
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — locked rules (boxes not pills, single grounding accent for highlights only, card chrome anatomy)
- `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md` — Shell → Tab → Card vocabulary (this PR adopts the Card visual without renaming components)
- `~/scoracleWiki/wiki/Architecture/Vibe Score Surface.md` — Phase 3, where the next adoption beat lands
