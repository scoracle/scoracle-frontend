# v2 VibeCard rewrite — tarot card system shipped

**Date:** 2026-05-09
**Scope:** Phase 3 of the v2 build-out. Rips out the pre-pivot emoji + randomized blurb + robot-mascot system in `VibesTab` and replaces it with the v2 tarot card: 11 major-arcana archetypes, frontend-cached reversal mechanic, deck-back null state, real archetype illustrations from Claude Design. Renames the file to `VibeCard.tsx` per the locked Shell→Tab→Card vocabulary.

## Goal

The 2026-04-22 backend pivot moved Gemma from blurb-emitting to numeric-score-emitting (1–100), but the frontend never updated — `VibesTab.tsx` still rendered emoji + randomized blurb + robot-mascot null states. This was the largest single drift between current code and the v2 brief. Phase 3 closes it: replace the emoji body with a tarot card built around the 11 major-arcana mapping in [[Vibe Score Surface]], use Claude Design's freshly-delivered archetype illustrations, and ship the reversal mechanic via frontend-cached state (no backend coordination needed).

## What Was Done

Three commits, ordered foundation → rename → rewrite.

### Commit 1 — band mapping + reversal helper + tests

Pure data + logic, no UI change.

- `src/lib/vibe/archetypes.ts` — `ARCHETYPES` constant: 11 major arcana with score range, name, Roman numeral, vibe subtext, and slug. `scoreToArchetype(score)` helper does the band lookup; returns null for out-of-range or non-finite input.
- `src/lib/vibe/archetypes.test.ts` — 14 tests: boundary values across all 11 bands, full 1–100 coverage without gaps, score-descending ordering invariant, null handling.
- `src/lib/vibe/reversal.ts` — `evaluateReversal()` reads previous score from localStorage, computes reversal verdict (current ≤ previous − 4), writes new score back. `isReversed()` is the pure verdict; `readPreviousScore` / `writeCurrentScore` are the storage primitives. Runtime feature-detection (`getStorage()`) handles SSR, Safari private mode, and quota-exceeded.
- `src/lib/vibe/reversal.test.ts` — 11 tests: threshold, asymmetric upward/downward, namespacing, round-trips, parse errors, quota errors. Includes a Map-backed Storage shim because happy-dom in this version ships a `localStorage` object missing the Storage methods.

### Commit 2 — rename `VibesTab` → `VibeCard`

Pure structural rename per the v2 vocabulary. *Lean into Shell → Tab → Card* per user direction.

- `git mv src/components/solid/VibesTab.tsx → VibeCard.tsx`
- `git mv src/components/solid/VibesTab.css → VibeCard.css`
- `VibeCard.tsx` CSS import updated to `./VibeCard.css`
- `ProfileCard.tsx` import path updated to `./VibeCard`

Internal symbols (`function VibesTab`, `VibesTabSkeleton` export) intentionally kept until commit 3 since the body was about to be rewritten anyway. Compiled cleanly between commits 2 and 3.

### Commit 3 — rewrite VibeCard body for v2

The big visible change. `VibeCard.tsx` and `VibeCard.css` rewritten end-to-end.

**Removed:**
- The 5-tier emoji array (`😞 😟 😐 🙂 🤩`) and 25 hand-written blurbs with template-literal player-name interpolation
- The `RobotSvg` component (hand-drawn lonely-robot mascot for null states)
- "Model is training" / "Not enough news yet" copy
- All entity-name lookups via `entityDataStore` + sport-meta (no longer needed without blurbs)
- `formatDate` import (no card footer date)

**Added — the v2 layout:**

```
┌─────────────────────────────────────┐
│ XIX                            XIX  │  ← corner numerals (italic Georgia,
│                                     │     Soft sand; bottom-right rotated)
│         [archetype art]             │  ← /vibe-art/the-sun.svg, 96px
│                                     │     (rotates 180° on reversal)
│              94                     │  ← Tan Nimbus 80–84px italic
│                                     │     (visual anchor)
│            THE SUN                  │  ← caps display, ~15px
│                                     │
│   radiant, ascending · ↓ from 99    │  ← italic subtext + reversal addendum
│                                     │
└─────────────────────────────────────┘
```

**Component structure:**
- `<Show when={vibe()} fallback={<NullCard />}>` — wait for the fetched score; render `NullCard` (deck-back face + "watching for mentions") when backend returns null.
- `<Show when={archetype()} fallback={<NullCard />}>` — defensive against out-of-range scores.
- Two `<span class="vibe-corner-num">` for the tarot corner-numeral chrome — top-left upright, bottom-right rotated 180°. The numeral is `arc().numeral` (e.g., `XIX` for The Sun). Same convention as `EntityMeta`'s entity-ID corner numerals — distinct numbers, identical chrome treatment.
- `<div class="vibe-art" classList={{ reversed: ... }}>` — the archetype illustration. CSS `transform: rotate(180deg)` on `.reversed` class flips it during reversal; corner numerals + score + name + subtext stay upright per the brief's "image content rotates, text stays right-side up" rule.
- Score: `font-family: var(--font-display)` (Georgia), `font-style: italic`, `font-size: clamp(4rem, 14vw, 5.25rem)` — hits the brief's 80–84px target on profile-width, scales down on narrow viewports.
- Subtext: `<span>{arc().vibe}</span>` always; conditionally appends `<span class="vibe-subtext-reversal"> · ↓ from {previousScore}</span>` when reversal fires.

**Reversal mechanic (frontend-cached):**
- `evaluateReversal({ sport, type, id }, score)` reads localStorage cached previous, computes reversal flag if score dropped ≥ 4 since last viewing, writes new score back. All in one call.
- Wrapped in a `createMemo` so it re-evaluates only when the fetched score changes (not on unrelated reactive updates).
- First visit: previous is null → no reversal possible (correct — same as backend null case).
- Subsequent visits with a meaningful drop: reversal fires; illustration flips; subtext shows `↓ from N`.
- Cache survives across sessions (localStorage). Cache is per-entity (namespaced by sport + type + id).

**Null state:**
- `<NullCard />` renders the deck-back face (`/vibe-art/deck-back.svg`) at 200×300 aspect, sized responsively via `clamp(160px, 50vw, 220px)`.
- Single italic line: `watching for mentions` — the only copy on a null card. AWAITING name slot was considered and dropped per *elegance through simplicity*.
- No corner numerals on the null card (no archetype yet → no numeral to show).

### Asset wiring

Claude Design delivered all 12 SVGs (11 archetypes + 1 deck-back) — copied to `public/vibe-art/`. Filenames match the `slug` field in `archetypes.ts` for clean dynamic referencing (`/vibe-art/${arc.slug}.svg`).

- All archetype SVGs are 36×36 viewBox, hairline strokes (0.7), Smoke (`#232020`) hardcoded, `stroke-linecap: round` for soft hand.
- Deck-back is 200×300 viewBox with double border, corner ornaments, top + bottom celestial marks, centered crystal-ball composition (concentric circles + stars + crescent moon), 8-point compass rose. The crystal-ball mark comes through as the visual anchor exactly as briefed.
- Asymmetric archetypes (Hermit, Death, Devil) were deliberately designed for rotational symmetry — they read as themselves whether upright or rotated 180°, satisfying the reversal-readability constraint baked into the original Claude Design prompt.

## Files Changed

**Added:**
- `src/lib/vibe/archetypes.ts`, `archetypes.test.ts`
- `src/lib/vibe/reversal.ts`, `reversal.test.ts`
- `public/vibe-art/the-world.svg`, `the-sun.svg`, `the-star.svg`, `strength.svg`, `the-magician.svg`, `temperance.svg`, `the-hermit.svg`, `the-moon.svg`, `the-tower.svg`, `death.svg`, `the-devil.svg`, `deck-back.svg` (12 assets from Claude Design)

**Renamed:**
- `src/components/solid/VibesTab.tsx` → `VibeCard.tsx`
- `src/components/solid/VibesTab.css` → `VibeCard.css`

**Modified:**
- `src/components/solid/VibeCard.tsx` — full rewrite (emoji + blurb + robot out; tarot card structure + reversal + null deck-back in)
- `src/components/solid/VibeCard.css` — full rewrite (5-tier accents + emoji sizing + robot styling out; corner numerals + archetype art + Georgia italic score + null card + responsive in)
- `src/components/solid/ProfileCard.tsx` — import + JSX use renamed `VibeCard` / `VibeCardSkeleton`
- `src/lib/data/sport-meta.ts` — comment cleaned (`VibesTab` reference removed; the helper is now used by no one specifically named, but kept since the pattern is the right one for future tab consumers)

**Vault:**
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-09_v2-vibecard-rewrite.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — Phase 3 row

## Verification

```bash
cd ~/scoracle-frontend
npx tsc --noEmit       # passes — no type errors
npx vitest run         # 92 tests pass (was 67 before this session; +25 new for vibe)
```

Browser-side smoke after dev reload (any profile page → News mode → Vibes tab):
- Drawn cards render the appropriate archetype (e.g., Cole Palmer's score → matching arcana), with the Roman numeral in opposing corners, the illustration centered, the score number large and italic.
- First visit shows no reversal flip (previous score is null in cache).
- Second visit after a downward score change ≥ 4 shows the illustration rotated 180° and `↓ from N` appended to the italic subtext.
- Null cases (entity with no Gemma score yet) render the ornate deck-back with `watching for mentions`.

## Result

Phase 3 ships the headline v2 feature. The vibe score is now a tarot card with real archetype art, frontend-cached reversal, and a deck-back null state. The component is named correctly (`VibeCard` per the Shell→Tab→Card vocabulary). The `/vibe-art/` directory becomes the home for tarot art (Claude Design's outlines today; the eventual tattoo-artist commission later — drop-in replacement when delivered).

## Implications + carry-forwards

- **Backend coordination is now optional, not blocking.** The original [[Vibe Score Surface]] plan had backend exposing `previous_score` for reversal; frontend-cached state replaces that with no semantic loss (and arguably more meaningful product — reversal is relative to the user's last visit). The twice-daily cron + `vibe_recompute_requested` NOTIFY channel from the planned backend coord is still useful for fresher scoring, but the frontend ships without waiting for it.
- **The asset directory is the swap point.** When the tattoo artist's commission delivers the final illustrations, drop them into `public/vibe-art/` with the same filenames; no code change needed. Same for the deck-back.
- **Corner numerals are a chrome convention now used twice** — once on `EntityMeta` (entity ID, plain Arabic) and once on `VibeCard` (archetype Roman numeral). When other Cards adopt corner numerals (`TraitsCard`, `GraphsCard` future-state), they pick the right number system for their data. This is exactly what the v2 brief's *chrome reveals data* principle calls for.
- **No backend coord on `previous_score` after all** means the [[Vibe Score Surface]] doc has a slight overspec — should be amended to clarify that the frontend cache is the canonical reversal store. Will land in next vault sweep.
- **`getSportMeta` may now be orphaned.** The helper was created for `VibesTab` to look up player names for blurbs; with blurbs gone, no one calls it. Worth a follow-up cleanup pass to verify and either delete or document its general usefulness.
- **Future enhancements** (not in scope for this commit, listed for the roadmap):
  - Corpus disclosure line ("from N mentions · last 7d") — needs `sample_size` from backend.
  - History sparkline trust-guardrail — could use `/vibe/{id}/history` endpoint.
  - First-draw flip animation (null → drawn transition).
  - "Today's draws" / "First draws" discovery surfaces.
  - Default-landing-tab decision (vibe as default in News-mode).
  - Share Frame integration (Phase 4) — wraps VibeCard for outbound share artifacts.

## Related

- `~/scoracleWiki/wiki/Architecture/Vibe Score Surface.md` — full v2 spec this implements
- `~/scoracleWiki/wiki/Architecture/Component Hierarchy.md` — Shell → Tab → Card vocabulary
- `~/scoracleWiki/wiki/Aesthetic Vision.md` — corner numeral convention; reversal asymmetry
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-corner-numerals.md` — the chrome convention this card inherits
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-card-lift.md` — the card chrome this card lives inside
- Future: tattoo artist commission delivers the final 12 SVGs as drop-in replacements in `public/vibe-art/`
