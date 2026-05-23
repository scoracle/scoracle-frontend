# 2026-05-23 — Veil card: "(no mentions found)" note

## Goal

Add a small parenthetical note directly below the Veil card's "drawn
but unread" subtext, in the same italic body font / 0.85rem size, that
reads `(no mentions found)`. Gives the user one more bit of context for
*why* the card is in its null state.

## What Was Done

`EmptyCard.tsx`:
- New optional `note?: string` prop, defaults to `"(no mentions found)"`.
- Suppressible by passing an empty string (in case a future caller
  wants the Veil without the parenthetical — e.g., a placeholder mid-
  load where "no mentions found" would be misleading).
- Imported `Show` to gate the render.

`EmptyCard.css`:
- New `.empty-card-note` rule — identical font / size / color /
  letter-spacing / line-height to `.empty-card-text`, just a tighter
  `margin-top` (0.2rem vs 0.6rem) so it reads as a continuation of the
  line above rather than a separate paragraph.

## Files Changed

- `src/components/solid/EmptyCard.tsx`
- `src/components/solid/EmptyCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 123/123

UI not opened in the browser this commit.

## Result

Every empty Card now shows three centered lines under the Veil
illustration: `THE VEIL` (caps), `drawn but unread` (italic, archetype
subtext), and `(no mentions found)` (italic, same font, tighter gap).
Callers can override either line.
