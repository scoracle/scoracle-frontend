# 2026-05-10 — v2 chrome lift to the Shell + whisper-warm neutral palette consumption

## Goal

Two coordinated pivots:

1. **Chrome lifts from Card to Shell.** Previously `VibeCard` rendered its own corner Roman numerals + had a `.vibe-card-wrapper margin: -24px` hack to align them with the Shell edge. When users flipped tabs (sticky-mount `display: none/block`), VibeCard's numerals would blink out and ContentShell's corner dots would blink in — visibly noisy. Lift the responsibility: Shell renders the corner slot, Cards just publish their card-specific label to context. Same chrome convention, single DOM element, content swaps in place. Locked as `[[Component Hierarchy]]` *rule 0* and `[[Aesthetic Vision]]` *locked rule 10*.
2. **Consume `@scoracle/tokens@0.4.0`** (the whisper-warm neutral palette). Retires the cream/sand/indigo system; surfaces are now neutral gray with a whisper of warmth (matching the brand's actual reference cousins). Update hardcoded palette values in non-tokenized chrome (shadow rgba, SVG strokes) to track the new `--text` Ink and `--text-tertiary` Soft gray.

## What was done

### Chrome lift (Shell ownership)

- `src/contexts/profile.ts` — extended `ProfileContextValue` with `cornerLabel: Accessor<string | undefined>` + `setCornerLabel: Setter`. Doc comment cites the chrome-lift rationale.
- `src/routes/profile.tsx` — instantiate `[cornerLabel, setCornerLabel] = createSignal<string | undefined>(undefined)`; pass into the Provider.
- `src/components/solid/VibeCard.tsx`:
  - Added `createEffect` that publishes `archetype()?.numeral` to `ctx.setCornerLabel` when VibeCard is the active pane (`mode === "news" && newsSubTab === "vibes"`), and `undefined` otherwise. Sticky-mount stays valid — the effect drives the lifecycle, not mount/unmount.
  - Removed the `<span class="vibe-corner-num vibe-corner-num-tl">` + `-br` spans from `cardBody()`. Inline comment points the reader at the chrome-lift contract.
  - Pass `cornerLabel={archetype()?.numeral}` to `<ShareFrame>` so the share artifact preserves the corner chrome.
  - Imported `createEffect` from `solid-js`.
- `src/components/solid/VibeCard.css`:
  - Removed `.vibe-corner-num`, `.vibe-corner-num-tl`, `.vibe-corner-num-br` rules.
  - `.vibe-card-wrapper { margin: -24px }` stays — still required to pull the in-app share button (`top: 14, right: 14`) to the Shell edge. Comment updated to reflect that corner numerals are no longer the reason.
- `src/components/solid/ContentShell.tsx`:
  - Renders `<span class="shell-corner-num shell-corner-num-tl">{ctx.cornerLabel()}</span>` + `-br` directly on the Shell.
  - Conditional `has-corner-label` class for CSS to suppress dot fallback when a label is set.
  - Removed the `suppressDots()` logic + `no-corner-dots` class entirely.
- `src/components/solid/ShareFrame.tsx`:
  - Added `cornerLabel?: string` to `ShareFrameProps`.
  - When set, renders identical `.shell-corner-num-tl` + `-br` spans inside `.share-frame`. Mirrors the in-app Shell so the share artifact carries the convention.
  - Imported `Show` from `solid-js`.
- `src/global.css`:
  - Replaced the dual-radial-gradient `::after` dot rules with a clean split:
    - `.shell-corner-num` — Shell-level corner numeral (Italic Georgia, Soft gray, positioned top:8/left:14 + bottom:8/right:14-rotated).
    - `.tab-shell::before/::after` + `.content-shell:not(.has-corner-label)::before/::after` — small Soft-gray circle fallback at top:13/left:13 + bottom:13/right:13.
  - Header comment updated to cite the chrome lift.

### Palette consumption (`@scoracle/tokens@0.4.0`)

- `package.json` — bumped `@scoracle/tokens` dep `^0.3.0` → `^0.4.0`.
- Synced built tokens (`dist/`) into `node_modules/@scoracle/tokens/` and updated the installed package.json version (no published registry; local sync is the install path).
- `src/global.css` — Card cardstock-edge border + 4-layer shadow stack `rgba(35, 32, 32, ...)` → `rgba(23, 23, 23, ...)` (new Ink). Doc comment in the `.card::before` block updated to reference the new Soft gray (`#9C9890`) baked into the weathered-border SVG.
- `src/components/solid/ShareFrame.css` — same shadow rgba retoning.
- `src/components/solid/VibeCard.tsx` — `toBlob` `backgroundColor: "#FAF3E3"` → `"#F4F1EB"` (matches new `--bg-card`).
- `public/chrome/weathered-tarot-border.svg` — stroke `#8A7A5C` → `#9C9890` (the new `--text-tertiary`).
- `public/vibe-art/*.svg` (11 archetypes + deck-back) — stroke + fill `#232020` → `#171717` (new Ink) via batch `sed`.

## Files changed

- `src/contexts/profile.ts`
- `src/routes/profile.tsx`
- `src/components/solid/VibeCard.tsx`
- `src/components/solid/VibeCard.css`
- `src/components/solid/ContentShell.tsx`
- `src/components/solid/ShareFrame.tsx`
- `src/components/solid/ShareFrame.css`
- `src/global.css`
- `package.json`
- `node_modules/@scoracle/tokens/` (local sync of built `0.4.0`)
- `public/chrome/weathered-tarot-border.svg`
- `public/vibe-art/*.svg` (12 files: 11 archetypes + deck-back)

## Verification

- `npx tsc --noEmit` — clean.
- `npm test` — 92/92 vitest tests pass.
- Manual browser verification deferred to user — UI changes for chrome positioning are eye-tested at the page level.

## Result

Chrome ownership is locked at the Shell level. Cards become pure data; the parent Shell draws the surface, border, lift, and corner expression. Tab flips inside ContentShell are visually quiet — the corner slot's DOM element stays mounted, only its text content varies (`""` ↔ `"XIX"` etc.). The same convention now extends to `ShareFrame` via the new `cornerLabel` prop, so share artifacts carry the chrome character without any duplicated rendering logic.

In parallel, the frontend now consumes the whisper-warm neutral palette from `@scoracle/tokens@0.4.0`. The cream/sand/indigo era is over; surfaces read as Skims-grade modern minimal with arcane character carried entirely by font, border, and corner chrome. All hardcoded `rgba(35,32,32,...)` and old-stroke `#232020` / `#8A7A5C` references retoned to the new Ink / Soft gray equivalents.

Companion docs:
- Tokens: `2026-05-10_v040-whisper-warm-neutral.md`
- Wiki: `[[Aesthetic Vision]]` locked rules 6/7/8/10 + Color system table + Card silhouette section + Card lift shadow spec
- Wiki: `[[Component Hierarchy]]` *rule 0: Chrome lives at the Shell, not the Card* (new section)
- Memory: `project_aesthetic_v2.md` updated with the chrome-lift contract + palette pivot
