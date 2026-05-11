# v2 corner numerals — chrome reveals data

**Date:** 2026-05-09
**Scope:** Final v2 chrome iteration this session. Adds entity ID as a tarot-style corner numeral on `EntityMeta` (MetaShell), positioned top-left upright and bottom-right rotated 180° — the classic tarot card numbering convention. ContentShell stays minimal. This supersedes the cartouche-break and four-phases-of-the-sun experiments earlier in the day (both reverted, see iteration history below).

## Goal

After three failed ornament experiments — cartouche break in the inset stroke (too subtle to read), four phases of the sun (too literal/decorative), Roman numerals at any scale (catastrophic at large IDs — Cole Palmer's `52847` rendered as ~52 `M`s in a row) — the right answer turned out to be the most obvious one. **Real tarot cards have a card number in the corner.** We have entity IDs. The chrome can *reveal data* instead of *decorating around it*.

User's framing nailed it: *"Tarot cards have the number of the card at the top left of the card, just inside the border. Just put the entity ID number there (in italics so it looks tarot). The number is upside down on the bottom right of the page."*

This ties the chrome convention to the [[Aesthetic Vision]]'s *we reveal information* pillar — even the frame surfaces data.

## What Was Done

### Two `<span>` corner numerals on `EntityMeta`

`src/components/solid/EntityMeta.tsx`: added two absolutely-positioned `<span class="meta-corner-num">` elements inside the `.meta-widget.card` div, both rendering `{id}` (the entity ID from `useProfile()` context). `aria-hidden="true"` on both — they're chrome, not informational text (the card already names the entity in its content).

```tsx
<div class="meta-widget card">
  <span class="meta-corner-num meta-corner-num-tl" aria-hidden="true">{id}</span>
  <span class="meta-corner-num meta-corner-num-br" aria-hidden="true">{id}</span>
  ...
</div>
```

### Corner numeral CSS — italic Georgia, Soft sand, opposing corners

`src/components/solid/EntityMeta.css`:

```css
.meta-corner-num {
  position: absolute;
  font-family: var(--font-display);   /* Georgia */
  font-style: italic;
  font-size: 0.75rem;
  font-weight: var(--weight-regular);
  color: var(--text-tertiary);        /* Soft sand */
  letter-spacing: 0.04em;
  z-index: 2;
  pointer-events: none;
}

.meta-corner-num-tl { top: 12px; left: 14px; }

.meta-corner-num-br {
  bottom: 12px; right: 14px;
  transform: rotate(180deg);
  transform-origin: center center;
}
```

Italic Georgia for the publication/tarot feel; Soft sand matches the inset stroke color so the numerals read as part of the same chrome layer; `z-index: 2` puts them above the inset stroke (which is `z-index: 0`) without conflicting with content (`z-index: 1`).

### ContentShell stays minimal

The `.profile-card.card` (ContentShell) does **not** get corner numerals. It has no single identifier the way `EntityMeta` does, and putting the same ID on both shells would just duplicate the chrome without adding meaning. Single-artifact cards opt in; structural shells stay minimal. Documented as a v2 rule in [[Aesthetic Vision]].

### Iteration history (this session, full arc)

For the record, in case future iteration revisits these:

1. **Original chrome cleanup** — Bone surface + hairline Smoke border + 4 corner dots + sharp edges. *(Earlier today.)*
2. **Double inset stroke + larger dots** — added `.card::after` for a tarot-card double-border effect. *Rejected* — solving the page-vs-card distinction problem with visual complexity instead of true card lift.
3. **Single stroke + paper-on-desk shadow** — reverted to single stroke; switched stroke + dots to softer `--text-tertiary`; added two-layer Smoke shadow at low opacity for genuine card lift. The shadow rule update softened the v2 *no drop shadows* rule (subtle paper-on-desk OK; SaaS-style still out).
4. **Lighter outline + dots removed** — stroke + (now removed) dots moved to `--border` (Faded sand). Cleaner minimal frame.
5. **Cartouche break** — small gap in top-center of inset stroke, evoking tarot card title space. *Rejected* — too subtle to read as anything intentional.
6. **Four phases of the sun (`MetaShell` only)** — sunrise/zenith/sunset/solar-disc SVG glyphs at corners via `background-image`. *Rejected* — too decorative; doesn't connect to data.
7. **Corner numerals** — *current state.* Entity ID at top-left + rotated bottom-right. Tarot-card numbering convention. Chrome ties to data.
8. **Roman numeral conversion** — replaced raw `id` with `toRoman(id)`. *Rejected* — `52847` → `MMMM...` cascade is illegible. Plain Arabic kept.

The mini-progress-docs for steps 2–6 (`2026-05-09_v2-chrome-polish.md`, `2026-05-09_v2-card-lift.md`, etc.) stand on their own as iteration history; this doc is the final state and the brand lock.

## Files Changed

**Modified:**
- `src/components/solid/EntityMeta.tsx` — added two corner-numeral `<span>`s after the opening `.meta-widget.card` div
- `src/components/solid/EntityMeta.css` — added `.meta-corner-num`, `.meta-corner-num-tl`, `.meta-corner-num-br` rules
- `src/global.css` — `.card::after` block (cartouche break) removed; `.card::before` keeps the single inset stroke at `--border` color from the prior polish iteration

**Vault:**
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — new *Corner numerals* section codifying the v2 card signature
- `~/.claude/projects/-home-sheneveld-scoracleWiki/memory/project_aesthetic_v2.md` — corner numeral rule added so it survives across sessions
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-09_v2-corner-numerals.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — final consolidated row for the chrome arc

**Deleted (briefly created, reverted same session):**
- `src/lib/utils/roman.ts` + `roman.test.ts` — the Roman numeral conversion utility. The 11-archetype mapping in [[Vibe Score Surface]] uses Roman numerals statically (no conversion needed); a future use case would recreate this if needed.

## Verification

Browser-side smoke after dev reload:
- `EntityMeta` renders the entity ID at top-left + bottom-right (rotated 180°) in italic Georgia.
- ContentShell renders without corner numerals (minimal frame + shadow).
- Cole Palmer (id `52847`) renders as `52847` and `52847` (rotated) — no `M` cascade.
- Detroit Pistons (id likely small) renders cleanly too.

## Result

**v2 card chrome is locked**:

| Element | Value |
|---|---|
| Background | Bone (`--bg-card`) |
| Inset stroke | 1px `--border` (Faded sand), at `inset: 6px` |
| Shape | Sharp corners (`border-radius: 0`) |
| Lift | Two-layer Smoke shadow at low opacity |
| Corner numerals | MetaShell only — italic Georgia, `--text-tertiary`, top-left + rotated bottom-right |

Both `EntityMeta` (MetaShell) and `ProfileCard` (ContentShell) share the same chrome silhouette via the global `.card` class, with `EntityMeta` adopting the corner numeral convention via its own component-level rules.

Phase 2 (chrome cleanup) is now genuinely complete. Phase 3 (`VibeCard` rewrite) is the next major frontend phase — and inherits this chrome convention with the major-arcana Roman numeral as the corner number (`XIX` for The Sun, `XVI` for The Tower, etc.; the 1–21 range is exactly where Roman is legible).

## Implications + carry-forwards

- **Corner numerals are the v2 card signature.** Any future Card type that opts in (e.g., the planned `VibeCard`, `TraitsCard`, `GraphsCard`, `CompareCard`) should carry this chrome with whatever number is meaningful for that card. The future `<Card>` Solid primitive (Phase 3+) should accept a `numeral` prop.
- **The `numeral` choice belongs to the card type, not the chrome system.** EntityMeta uses entity ID. VibeCard uses archetype Roman. Future cards pick what's natural. The chrome is the convention; the value is per-card.
- **ContentShell never gets corner numerals.** Structural shells stay minimal. Single-artifact cards opt in; container shells stay quiet.
- **Soft sand (`--text-tertiary`) is now the canonical chrome color** for both the inset stroke and the corner numerals — they're a unified chrome layer.
- **Roman numeral conversion was tried and removed** (utility deleted from the codebase). For VibeCard, the major-arcana Roman numerals will be hardcoded in the band-mapping constant (`{ score: 95-100, archetype: 'The World', numeral: 'XXI' }` etc.) — no runtime conversion needed.
- **Aesthetic Vision palette table page-bg value** is now `#E5DAC4` (set in tokens v0.3.1 earlier today; the original v2 brief value `#EFE7D5` is historical).

## Related

- `~/scoracleWiki/wiki/Aesthetic Vision.md` — *Corner numerals* section is the brand lock
- `~/scoracleWiki/wiki/Architecture/Vibe Score Surface.md` — Phase 3 inherits this chrome
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-card-lift.md` — preceding iteration; lived shortly
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-chrome-polish.md` — earlier iteration (double stroke, superseded)
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-chrome-cleanup.md` — original chrome landing
