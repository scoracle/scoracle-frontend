# v2 chrome — Warm slate frame + line-quiet feed rows

**Date:** 2026-05-10
**Scope:** Two paired refinements after the *Smoke frame + line-quiet ContentShell* pass earlier today: (1) Smoke chrome was too harsh against the lightened Bone — settle on Warm slate (the subtext color) as the middle ground; (2) extend the line-quiet rule from the tab-row chrome down to the feed item rows (news articles, tweets, co-mentions) — strip per-row dividers, gap-spacing carries separation.

## Goal

User feedback after the Smoke frame landed:

> 1. That's a little too harsh. Let's find a middle ground shade between the straight black and the one we had before. Maybe the same color as the subtext?
> 2. For the lines, this is much better. Now we just need to remove all the dividing lines that are cluttering it up.

The Smoke frame + Smoke corner numerals overshot — with Bone now at `#FAF3E3`, even a hairline of pure Smoke reads as a stark utility outline rather than a tarot frame. Subtext (`var(--text-secondary)` Warm slate `#5A5046`) is the natural middle: it's already the color the user reads as "supporting hierarchy" elsewhere on the card, so unifying chrome with it produces a cohesive supporting layer.

The feed-row dividers (NewsTab, XTab, CoMentionsTab) were the next obvious source of clutter inside ContentShell. The earlier chrome-line-removal pass cleared the structural lines (mode-toggle bottom, tabs-nav bottom); this pass clears the content-row lines.

## What Was Done

### Chrome stroke + corner numerals: Smoke → Warm slate

`src/global.css` — `.card::before` border color: `var(--text)` (Smoke) → `var(--text-secondary)` (Warm slate `#5A5046`).

`src/components/solid/EntityMeta.css` — `.meta-corner-num` color: `var(--text)` → `var(--text-secondary)`.

`src/components/solid/VibeCard.css` — `.vibe-corner-num` color: `var(--text)` → `var(--text-secondary)`.

The visual result: same sharp inset rectangle + opposing-corner italic numerals as before, just in the same Warm slate as the subtext copy. Reads as a deliberate tarot frame without feeling stark.

### Feed item dividers removed

`src/components/solid/NewsTab.css` — `.news-item` `border-bottom` + `:last-child` override removed. The parent `.news-list` already has `gap: 1.5rem` carrying row separation.

`src/components/solid/XTab.css` — `.tweet-card` `border-bottom` + `:last-child` + `:first-child` overrides removed. Added `gap: 1.5rem` to `.x-feed` (parent flex container) to preserve row spacing now that per-card padding+border is gone. Net spacing is roughly equivalent.

`src/components/solid/CoMentionsTab.css` — `.co-mention-item` `border-bottom` + `:last-child` override removed. (CoMentions is currently disconnected from the UI; cleaning for consistency so it's v2-compliant when re-enabled.)

### StatsTab dividers — deliberately untouched

`StatsTab.css` has 4 `border-*` rules used for table-row separation in stats grids. Those are **functional table separators** (numeric alignment, header/total row delineation), not decorative chrome. They stay until StatsTab gets its own v2 redesign pass. Documented in [[Aesthetic Vision]] as the explicit exception so future audits don't strip them naively.

## Files Changed

**Modified:**
- `src/global.css` — `.card::before` border `var(--text)` → `var(--text-secondary)`
- `src/components/solid/EntityMeta.css` — `.meta-corner-num` color `var(--text)` → `var(--text-secondary)`
- `src/components/solid/VibeCard.css` — `.vibe-corner-num` color `var(--text)` → `var(--text-secondary)`
- `src/components/solid/NewsTab.css` — `.news-item` divider stripped
- `src/components/solid/XTab.css` — `.tweet-card` divider stripped; `.x-feed` gets `gap: 1.5rem`
- `src/components/solid/CoMentionsTab.css` — `.co-mention-item` divider stripped

**Vault:**
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — *Card silhouette* section updated (Warm slate not Smoke); *ContentShell stays line-quiet* sub-section extended to cover row-level dividers + StatsTab exception note
- `~/.claude/.../memory/project_aesthetic_v2.md` — same refinements persisted across sessions
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-10_v2-warm-slate-and-feed-quiet.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row

## Verification

```bash
npx tsc --noEmit       # passes
npx vitest run         # 92 tests pass
```

Browser-side smoke after dev reload:
- Card frame + corner numerals read in Warm slate — strong but not harsh.
- News tab article rows separated by whitespace only, no horizontal lines.
- X tab tweet rows separated by whitespace only.
- StatsTab still has its functional table separators (intentional).

## Result

v2 chrome anatomy converges:

| Layer | Treatment |
|---|---|
| Outer Card silhouette | 6px rounded corners |
| Interior inset stroke | 1px **Warm slate** (`var(--text-secondary)`) at `inset: 6px` |
| Corner numerals | Italic Georgia, **Warm slate**, top-left + rotated bottom-right |
| Card surface | Bone `#FAF3E3` |
| Card lift | Two-layer paper-on-desk shadow at low opacity |
| Page surround | `#E5DAC4` |
| ContentShell internals | **No divider lines anywhere** — outer frame + active fills + gap-spacing carry structure |
| StatsTab tables (exception) | Functional row separators preserved until StatsTab v2 redesign |

## Implications + carry-forwards

- **Warm slate is now the canonical chrome color** — replaces the brief flirtation with Smoke. Frame, corner numerals, and subtext copy all share `--text-secondary`. They read as one cohesive supporting layer.
- **Future feed-style content cards** (e.g., a future timeline card, activity feed) follow the gap-not-divider pattern. Don't reach for `border-bottom` on row items.
- **StatsTab v2 redesign** is the next logical chrome cleanup — move stats grids onto a layout that doesn't need divider lines for numeric alignment (CSS subgrid + tabular-nums probably suffices). Out of scope for this PR.
- **Brand chrome anatomy is now stable.** No more iteration on stroke color, corner numeral color, or divider lines is needed for the current scope. Phase 4 (Share Frame) and Phase 5 (backend coord) can proceed without further chrome work.

## Related

- `~/scoracle-frontend/docs/progress/2026-05-10_v2-smoke-frame-and-content-quiet.md` — the previous (slightly-overshooting) iteration this dials back
- `~/scoracle-frontend/docs/progress/2026-05-10_v2-playing-card-shell.md` — earlier today; rounded outer + lighter Bone (companion tokens v0.3.2)
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — locked card silhouette + extended line-quiet rule
