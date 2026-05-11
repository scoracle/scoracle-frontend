# v2 playing-card shell — rounded outer, sharp interior

**Date:** 2026-05-10
**Scope:** Refines the Shell silhouette to match real tarot/playing cards: outer corners slightly rounded (the *card laid out on a table* feel), interior inset stroke stays sharp (the tarot-frame character). Pairs with `@scoracle/tokens@0.3.2` lightening Bone for stronger card-on-page contrast.

## Goal

User feedback after iterating on the v2 chrome:

> I want to dial in on the appearance of our shells. We have the nice hard edges, but I've been looking at lots of tarot cards and a key element is the edges are slightly rounded (like a playing card) and the hard edges are provided by the interior border (which we have). We want the user to feel like they're having the meta and content cards being laid out on the table for them.

The principle: separate the *outer-card silhouette* (soft, like a real card) from the *interior frame* (sharp, like a tarot border). The brand's "tarot edges are sharp" rule (from earlier this week) was right about the *interior* but wrong about the *outer silhouette* — real tarot cards have rounded outers because they're physical objects, not screen rectangles. Refining the brand rule to capture that nuance.

## What Was Done

### Outer Card silhouette: 6px rounded corners

`src/global.css` — `.card` `border-radius: 0` → `6px`.
`src/components/solid/EntityMeta.css` — `.meta-widget` `border-radius: 0` → `6px`.
`src/components/solid/ProfileCard.css` — `.profile-card` `border-radius: 0` → `6px`.

6px is a deliberate "subtle" round — large enough to read as a deliberate playing-card silhouette, small enough that it doesn't drift into SaaS-card territory. A typical playing card has ~3-4mm corner radius on a ~63mm wide card (~5%); on a 600px-wide profile card that'd be ~30px which feels too rounded; 6px (~1%) keeps the *physical-object* feel without softening into squishiness.

### Interior inset stroke stays sharp

`.card::before` (the inset hairline at `inset: 6px`) keeps its current shape: solid 1px `var(--border)` Faded sand stroke, **no border-radius**. The interior frame is still a sharp rectangle inside the slightly-rounded outer silhouette — the user sees a soft card edge with a hard tarot frame inside it.

This split — soft outer, sharp interior — is the brand silhouette.

### Lighter Bone (companion: tokens v0.3.2)

`@scoracle/tokens@0.3.2` lightens `--bg-card` from `#F2EBDC` to `#FAF3E3`. Combined with this PR's rounded outer corners + the existing paper-on-desk shadow, the visual result is: warm-cream Cards visibly floating above the slightly darker cream Page surround, each Card a soft-edged physical object with a sharp tarot frame inside.

No frontend dep bump required — `@scoracle/tokens@^0.3.0` semver allows `0.3.2` to flow in on next `npm install`.

## Files Changed

**Modified:**
- `src/global.css` — `.card` `border-radius: 0` → `6px`; comment block updated to document the playing-card-outer / sharp-interior rationale
- `src/components/solid/EntityMeta.css` — `.meta-widget` `border-radius: 0` → `6px`
- `src/components/solid/ProfileCard.css` — `.profile-card` `border-radius: 0` → `6px`

**Vault:**
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — refined locked rule #5 (the *boxes not pills, rigid over soft* rule now explicitly distinguishes outer-Card-silhouette from interior-frame); new *Card silhouette* section documenting the playing-card outer + tarot-frame interior anatomy; palette table updated for the new Bone value
- `~/.claude/.../memory/project_aesthetic_v2.md` — silhouette rule added so it survives across sessions
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-10_v2-playing-card-shell.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row

## Verification

```bash
npx tsc --noEmit         # passes
npx vitest run           # 92 tests pass
```

Browser-side smoke after dev reload (with tokens 0.3.2 installed):
- Both shells (`MetaShell` + `ContentShell`) read as warm-cream cards floating above a slightly-darker cream page.
- Outer corners visibly rounded (subtle — playing-card-feel, not SaaS-rounded).
- Interior inset stroke is sharp — the tarot frame is unambiguously rectangular.
- Combined with the corner numerals (entity ID for MetaShell, archetype Roman for VibeCard), the *cards being dealt out for the user* metaphor reads cleanly.

## Result

The v2 Card silhouette settles into its final form. Brand chrome anatomy is now:

| Layer | Treatment |
|---|---|
| Outer Card silhouette | 6px rounded corners (playing-card / tarot deal feel) |
| Interior inset stroke | Sharp 1px Faded sand at `inset: 6px` (tarot-frame character) |
| Card surface | Bone `#FAF3E3` (lightened) |
| Card lift | Two-layer paper-on-desk shadow at low opacity |
| Corner numerals | Italic Georgia, Soft sand, top-left + rotated bottom-right (chrome reveals data) |
| Page surround | `#E5DAC4` (Page, darker than Bone for visible separation) |

This is the shape every Shell and shareable Card adopts.

## Implications + carry-forwards

- **The locked rule "tarot edges are sharp" needed nuance.** Sharp at the *interior* frame; soft at the *outer* silhouette. Updated [[Aesthetic Vision]] to capture the distinction. Future Cards inherit both.
- **`<Card>` Solid primitive (Phase 3+ extraction)** should render with `border-radius: 6px` outer + sharp `::before` inset stroke as a single composable contract. The current `.card` global class encodes the contract in CSS today.
- **Interior content positioning** is unaffected — the inset stroke is at `inset: 6px` (rectangular, sharp) and content padding remains the same. Rounding the outer doesn't affect what's inside the inset.
- **`overflow: hidden`** on `.meta-widget` and `.profile-card` works correctly with `border-radius: 6px` — children that would extend past the rounded outer are clipped to the rounded silhouette.

## Related

- `~/scoracle-tokens/docs/progress/2026-05-10_v032-lighter-bone.md` — companion tokens patch
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-card-lift.md` — paper-on-desk shadow + previous chrome iteration
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-corner-numerals.md` — corner-numeral chrome that lives inside this silhouette
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — *Card silhouette* section + refined locked rule
