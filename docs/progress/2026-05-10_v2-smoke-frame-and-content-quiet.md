# v2 chrome — Smoke frame + line-quiet ContentShell

**Date:** 2026-05-10
**Scope:** Two paired refinements after the playing-card-shell pass landed earlier today: (1) the inset stroke + corner numerals darken to Smoke for stronger contrast against the lightened Bone surface; (2) ContentShell sheds its internal divider lines (mode-toggle bottom border + tabs-nav bottom border) so content carries the structure instead of chrome.

## Goal

User feedback after seeing the playing-card-rounded shells with lighter Bone:

> 1. Darken the borders (and entity number) in the shells. Straight black should match the theme.
> 2. We have too many lines in the content shell, it's distracting. Let's change it to just the outline — let the content speak for itself

The principle behind (1): with Bone now `#FAF3E3` (much lighter than the previous `#F2EBDC`), the soft Faded sand inset stroke and Soft sand corner numerals read as decoration, not as a deliberate tarot frame. The lighter the surface, the stronger the frame needs to be to hold its weight as a deliberate hard border. Smoke (`#232020`) is the brand "black" and does that work.

The principle behind (2): tabs nav + mode toggle were each carrying their own bottom border, plus the outer inset stroke. Three lines stacked vertically is cognitive noise — competes with content. Per the *content is the driver* pillar, chrome should stay out of the way.

## What Was Done

### Smoke frame + Smoke corner numerals

`src/global.css` — `.card::before` border color: `var(--border)` (Faded sand) → `var(--text)` (Smoke). Same 1px hairline, just darker.

`src/components/solid/EntityMeta.css` — `.meta-corner-num` color: `var(--text-tertiary)` (Soft sand) → `var(--text)` (Smoke). Italic Georgia stays.

`src/components/solid/VibeCard.css` — `.vibe-corner-num` color: `var(--text-tertiary)` → `var(--text)`. Same change for VibeCard's archetype Roman numeral, keeping the chrome convention consistent across MetaShell + VibeCard.

The visual result: a clean Smoke rectangle inset 6px from the card edge, with a small italic Smoke numeral in opposing corners. The frame reads as a deliberate tarot-card border instead of a soft ornament.

### ContentShell internal lines removed

`src/components/solid/ProfileCard.css` — `.profile-mode-toggle { border-bottom: 1px solid var(--border) }` removed.

`src/components/solid/TabContainer.css` — `.tabs-nav { border-bottom: 1px solid var(--border) }` removed.

The ContentShell now has exactly **one** visible line: the outer inset stroke. The mode toggle (NEWS / STATS) sits inside the frame; the active fill (Smoke background, Bone text) carries the "you're here" signal. The inner tabs (NEWS / X / VIBES, etc.) sit below it; the active fill again carries selection. Whitespace + tab-row spacing carry the structure.

This change applies platform-wide to any consumer of `TabContainer` (today: just ProfileCard's two TabContainer instances; future: any sandbox/fantasy/stats Card that uses TabContainer inherits the line-quiet treatment).

## Files Changed

**Modified:**
- `src/global.css` — `.card::before` border `var(--border)` → `var(--text)`
- `src/components/solid/EntityMeta.css` — `.meta-corner-num` color `var(--text-tertiary)` → `var(--text)`
- `src/components/solid/VibeCard.css` — `.vibe-corner-num` color `var(--text-tertiary)` → `var(--text)`
- `src/components/solid/ProfileCard.css` — `.profile-mode-toggle` `border-bottom` removed
- `src/components/solid/TabContainer.css` — `.tabs-nav` `border-bottom` removed

**Vault:**
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — *Card silhouette* section updated to specify Smoke for inset stroke + corner numerals; new *ContentShell stays line-quiet* sub-section codifying the no-internal-dividers rule
- `~/.claude/.../memory/project_aesthetic_v2.md` — same refinements persisted across sessions
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-10_v2-smoke-frame-and-content-quiet.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row

## Verification

```bash
npx tsc --noEmit       # passes
npx vitest run         # 92 tests pass
```

Browser-side smoke after dev reload:
- Both shells show a sharp Smoke rectangular frame inset from the edge.
- Corner numerals read clearly in Smoke italic Georgia.
- ContentShell has the outer frame + active mode toggle + active tab fills, **no other lines**. Tab content (articles, stats, etc.) sits cleanly underneath the tabs row without a border between.

## Result

Brand chrome anatomy is now finalized for v2:

| Layer | Treatment |
|---|---|
| Outer Card silhouette | 6px rounded corners (playing-card / tarot deal feel) |
| Interior inset stroke | 1px **Smoke** at `inset: 6px` (sharp, definite tarot frame) |
| Corner numerals | Italic Georgia, **Smoke**, top-left + rotated bottom-right |
| Card surface | Bone `#FAF3E3` |
| Card lift | Two-layer paper-on-desk shadow at low opacity |
| Page surround | `#E5DAC4` |
| ContentShell internals | **No divider lines** — outer frame + active fills + whitespace carry structure |

This is the locked v2 chrome. Future Cards inherit it; future Shells inherit it.

## Implications + carry-forwards

- **Smoke is now the canonical chrome stroke + numeral color** — no more Soft sand or Faded sand for decorative-frame purposes. Faded sand (`--border`) stays as a token for genuine border use cases (form input outlines, dividers in stat tables, etc.) but is OUT for the Card frame chrome.
- **The `--text-tertiary` (Soft sand) token** is now used only for chart sublabels and similar genuinely-tertiary text contexts — not for decorative chrome anymore.
- **Future Cards inside ContentShell** (TraitsCard, GraphsCard, CompareCard) **must not introduce new internal divider lines** between rows / sections / headers. Use whitespace, type weight, or section labels instead.
- **TabContainer** (the pillar primitive) now ships line-quiet. Sandbox + fantasy + ai sites that import it later get the line-quiet treatment for free.
- **Aesthetic Vision** locked rule "tarot edges are sharp" is now fully resolved: outer-Card-silhouette is 6px rounded (playing-card); interior inset stroke is sharp Smoke (tarot frame). The two pieces play together.

## Related

- `~/scoracle-frontend/docs/progress/2026-05-10_v2-playing-card-shell.md` — earlier today; rounded outer shells + lightened Bone (companion tokens v0.3.2)
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-corner-numerals.md` — corner-numeral chrome convention this refines
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-card-lift.md` — the paper-on-desk shadow this sits inside
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — locked card silhouette + content-shell-line-quiet rule
