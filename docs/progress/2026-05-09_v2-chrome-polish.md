# v2 chrome polish — tab containment, tarot character, softer outline

**Date:** 2026-05-09
**Scope:** Iteration on the v2 card chrome that landed earlier today. Four targeted fixes from user feedback after seeing the live render: (1) toggle/tab buttons sit within the card's inset stroke instead of bleeding past it; (2) corner dots and inset stroke read as more obviously tarot-inspired; (3) page surround visibly contrasts with card surfaces; (4) inset stroke/dots use Warm slate instead of Smoke for a softer, more vintage feel.

## Goal

User feedback after `2026-05-09_v2-chrome-cleanup` landed:

> 1. We need the selection tabs to fit within the card.
> 2. It's maybe a little too minimal? It's hard to tell that this is tarot inspired.
> 3. I think we need either some shadowing or a difference in color between the cards/shells and the background.
> 4. Maybe a lighter color than black for the card outline?

Address all four without breaking the `Aesthetic Vision` rules (no shadows, no gradients) and without introducing new tokens or new components.

## What Was Done

### (1) Tab + toggle containment — `ProfileCard.css` gets padding

`ProfileCard` was rendering with zero internal padding, so the mode toggle (NEWS / STATS) and the inner `TabContainer`'s tabs (NEWS / X / VIBES) were laid edge-to-edge against the card's outer rectangle. The inset stroke at 6px was *behind* the active toggle's dark Smoke background, producing the bleed in the screenshot.

Fix: `padding: 14px` on `.profile-card`. Math: outer inset stroke at `6px`, inner stroke at `10px` (see point 2 below — this PR adds the inner stroke), so 14px puts content 4px inside the inner stroke — enough breathing room that the active button's dark fill clearly lives inside both strokes, not on top of them.

`EntityMeta` did not need this fix — it already manages its own internal padding (`.meta-content { padding: 1.5rem; }` etc.), so its content was already sitting well inside the inset stroke.

### (2) More obvious tarot character — bigger dots + double inset stroke

Two CSS changes to `.card` in `src/global.css`:

**Larger corner dots.** The earlier `2026-05-09_v2-chrome-cleanup` PR put dots at `1.4px` radius. Tarot card mockups in the v2 PDF brief use dots at `r=1.1` in a `200×300` viewBox — that's ~0.7% of card width. On a real ~600px-wide profile card, the equivalent is `r ≈ 4.2px`. Ours were under-sized to the point of reading as artifacts. Bumped to `3px`. Also moved them slightly inward — `14px` → `16px` from the corner — so they're not visually crowded by the inset stroke.

**Double inset stroke.** Single-stroke borders read as utility cards (think "card-shaped div"); double-stroke borders read as *card-as-artifact* — the visual move that signals tarot, classical-publication, hermetic-frame. Added `.card::after` as a second hairline at `inset: 10px` (4px inside the existing `::before` at `inset: 6px`). The 4px gap between the two strokes is the tarot-card border-breathing-room idiom — narrow enough to read as one ornamented border, wide enough to register as deliberate.

Together: cards now read as small tarot-inspired objects, not as soft SaaS cards with a thin line on them.

### (3) Page vs card contrast — companion to tokens `0.3.1`

This work depends on `@scoracle/tokens@0.3.1` (companion progress doc: `~/scoracle-tokens/docs/progress/2026-05-09_v031-page-bg-contrast.md`), which shifts `--bg` from `#EFE7D5` to `#E5DAC4`. With the tokens patch in place, the page surround is visibly darker than Bone (`#F2EBDC`) cards — separation reads cleanly without needing a drop shadow. **No frontend change needed for this point** — the dep at `^0.3.0` picks up `0.3.1` automatically on next `npm install`.

### (4) Softer card outline — `--text` → `--text-secondary`

The dots and both inset strokes now use `var(--text-secondary)` (Warm slate `#5A5046`) instead of `var(--text)` (Smoke `#232020`). Same hairline weight (1px), much softer presence — vintage tarot warmth instead of stark contrast. The frame still reads clearly against the Bone card surface but doesn't fight the content for attention.

## Files Changed

**Modified:**
- `src/global.css` — `.card` rule: dot radius `1.4px` → `3px`, dot color `--text` → `--text-secondary`, dot position `14px` → `16px`; `.card::before` color `--text` → `--text-secondary`; new `.card::after` second inset stroke at `inset: 10px` with same color
- `src/components/solid/ProfileCard.css` — `.profile-card` gets `padding: 14px` so toggle row, tabs nav, and tab content all sit inside the double inset stroke

**Vault:**
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-09_v2-chrome-polish.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row

**No changes:**
- `package.json` (no version bump — chrome-only, dep at `^0.3.0` flows `0.3.1` automatically)
- Any `.tsx` files (deliberately CSS-only)
- `EntityMeta.css` (its existing padding already accommodates the inset strokes)

## Verification

```bash
# Companion: pull tokens 0.3.1 (after it's published from the tokens repo)
npm install @scoracle/tokens@^0.3.1   # caret already allowed; install is just to pick up published 0.3.1
npm run dev
```

Browser-side smoke after dev reload:
- Page surround visibly darker than card surfaces (no need to squint).
- Cards have **double** inset stroke in Warm slate, **larger** corner dots in Warm slate, sharp edges.
- ProfileCard's mode toggle (NEWS/STATS) sits clearly inside both inset strokes — active toggle's dark fill no longer bleeds past the frame.
- Inner TabContainer's sub-tabs (NEWS/X/VIBES, STATS/TRAITS/COMPARE) likewise contained.
- Cards now read as tarot-inspired objects, not as SaaS cards.

## Result

The v2 visual identity reads correctly against user expectations. Card chrome is now: Bone surface, Warm-slate double inset stroke, four 3px Warm-slate corner dots, sharp edges, contained content with breathing room. Cards visibly float above the page surround.

Phase 2 (chrome cleanup) now actually complete in spirit. Phase 3 (`VibeCard` rewrite) can build directly on this foundation.

## Implications + carry-forwards

- **The double inset stroke is the v2 brand silhouette going forward.** When the eventual `<Card>` Solid primitive ships (Phase 3), it should render the same `::before` + `::after` chrome — the CSS pattern in `global.css` is the contract. Don't introduce a third stroke; don't drop one.
- **`var(--text-secondary)` is now the canonical "card chrome" color** (inset strokes, corner dots). `var(--text)` (Smoke) stays the primary text color *and* the dark-chrome background color (header bar, active toggle/tab fills). Distinct semantics, distinct tokens — keep them separate.
- **The 14px padding on `.profile-card`** is structural — it's how the chrome frame stays uninterrupted. If a future feature needs more visible internal padding, pad the inner content (`.tabs-content`, `.profile-mode-pane`), not the card itself.
- **`EntityMeta.css` does not currently use `padding` to clear the inset stroke** — its inner-content-managed padding happens to work. If `EntityMeta` is ever rewritten or its internal padding logic changes, audit that the meta content still sits inside the new double inset stroke.
- **The `.card` rule now uses both `::before` and `::after`** — that's the entire pseudo-element budget. If a future feature needs another decorative layer (e.g., a "today's draw" highlight on `VibeCard`), it'll need a real DOM element, not a third pseudo.
- **Aesthetic Vision palette table needs a one-line update** next time the doc is touched: Page bg `#EFE7D5` → `#E5DAC4`. Skip a churn-only edit; ride along on the next substantive update.

## Related

- `~/scoracle-tokens/docs/progress/2026-05-09_v031-page-bg-contrast.md` — the companion tokens patch this work depends on
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-chrome-cleanup.md` — earlier this session; this polish iterates on that work
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — locked rules (boxes not pills, no shadows/gradients, card chrome anatomy, Page bg value pending update)
- `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md` — Shell → Tab → Card vocabulary that the `.card` chrome implements
