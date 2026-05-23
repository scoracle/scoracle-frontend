# 2026-05-23 — The Veil: vibe-card-shaped null state

## Goal

Replace the generic deck-back illustration on `EmptyCard` with a new
vibe-card variant — **The Veil** — so the null state across every Card
(Vibes, Articles, X, Trends, …) reads as part of the same antique-tarot
deck rather than a separate "error" affordance. The Veil joins the
existing eleven score-banded archetypes as the conceptual 12th member
of the deck, used whenever a Card resolves with no result.

## What Was Done

- **Asset**: `the-veil.svg` (user-provided 36×36 tarot line drawing,
  stroke color normalized from `#232020` → `#171717` to match the other
  archetype assets) installed at `public/vibe-art/the-veil.svg`.
- **Archetype**: `VEIL_ARCHETYPE` exported from
  `src/lib/vibe/archetypes.ts` alongside the existing `ARCHETYPES`
  array. Sentinel `min/max: -1` keeps it out of `scoreToArchetype`'s
  score-band scan (and the pinned ARCHETYPES.length === 11 test).
  Numeral `'0'`, name `'The Veil'`, vibe `'drawn but unread'`.
- **EmptyCard refactor**: now renders the Veil archetype in the same
  shape VibeCard uses for any resolved archetype — Veil illustration at
  top (96×96, same dims as `.vibe-art`), caps name `THE VEIL`, italic
  subtext (overridable). Corner numeral `'0'` passed to `<Shell>` via
  `cornerLabel`. No score number — the absence of a number is the
  point.
- **CSS**: replaced the deck-back's portrait-rotated layout with the
  same vertical rhythm VibeCard uses (`.empty-card-art`, `.empty-card-name`,
  `.empty-card-text`), including the same `@media (max-width: 480px)`
  reductions.
- **Docstrings**: VibeCard and ArticlesCard updated so future readers
  see "Veil" instead of stale "deck-back" references.
- **Tests**: 3 new assertions on `VEIL_ARCHETYPE` (slug + numeral +
  name; not in ARCHETYPES; sentinel range can't be matched by a real
  score). 123/123 passing.

## Files Changed

- `public/vibe-art/the-veil.svg` (new)
- `src/lib/vibe/archetypes.ts` — `VEIL_ARCHETYPE` export
- `src/lib/vibe/archetypes.test.ts` — Veil test block
- `src/components/solid/EmptyCard.tsx` — render Veil layout
- `src/components/solid/EmptyCard.css` — VibeCard-aligned styles
- `src/components/solid/VibeCard.tsx` — docstring refresh
- `src/components/solid/ArticlesCard.tsx` — docstring refresh

`public/vibe-art/deck-back.svg` is left on disk (no code references it
now, but keeping it lets us revert quickly if the Veil treatment needs
to come back).

## Verification

- `npm run typecheck` — clean
- `npm test` — 123/123 (+3 Veil-archetype tests)

UI not opened in the browser this commit.

## Result

Every empty Card across the platform now shows the Veil — a small
tarot-style figure, the words `THE VEIL`, and the subtext `drawn but
unread` (or a context-specific override). The vibe-card visual
language extends to the null state, so the deck always looks like the
deck.
