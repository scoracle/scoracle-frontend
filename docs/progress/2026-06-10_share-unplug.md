# Share unplug — pause the feature, keep the machinery

**Date:** 2026-06-10

## Goal

Unplug the share feature from all cards. It's noisy and not yet working as
intended; the component is critical later, so the machinery stays — only the
triggers stop rendering. Re-enabling is a registry flip.

## What was done

- **`card-meta.ts`** — every `shareable` flag flipped to `false`
  (composite/specialist/trends/vibes/leaderboard), with a header comment marking
  the pause. `CARD_META.shareable` is the designed one-switch seam: `<Card>`
  renders `<ShareTrigger>` only when its entry is true, so the profile cards
  needed zero per-card edits.
- **`leaderboard.tsx`** — the page's bespoke `.lb-share` button (it wires
  `shareCard` directly rather than going through `<Card>`) is now gated on
  `CARD_META.leaderboard.shareable`, putting it behind the same registry switch.
  `shareBoard`/`shareFallback` stay referenced inside the gated JSX — no dead
  code, no unused-import fallout.

Untouched (deliberate): `ShareTrigger`, `lib/share/dispatch`,
`ShareFallbackModal`, the `/og/...` routes + OG meta tags (crawler-side, not
noisy UI), and all share metadata plumbing. Flipping a flag back to `true`
restores that surface's share end-to-end.

## Files changed

- `src/lib/cards/card-meta.ts`
- `src/routes/leaderboard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright sweep: zero share triggers on NFL team composite, NFL QB composite,
  vibes/specialist/trends tabs (football GK), and `/leaderboard` — cards
  otherwise render unchanged (screenshot-checked).

## Result

No share UI renders anywhere; the feature is paused, not removed. Ships in the
same cf:deploy as the 056 team-template work.
