# 2026-05-14 — VibeCard share ref bug fix

## Goal

Fix the blank-PNG bug on the VibeCard share button. Clicking share downloaded
an empty image instead of the rendered card.

## What Was Done

Root cause: `shareFrameRef` was attached to the offscreen wrapper `<div
class="share-frame-offscreen">` (positioned at `left: -10000px`), not the
actual `<ShareFrame>` root. `html-to-image`'s `toBlob` snapshotted the empty
wrapper.

Two-line fix:

- `ShareFrame.tsx` now accepts `ref?: (el: HTMLDivElement) => void` and
  attaches it to the root `<div class="share-frame">`.
- `VibeCard.tsx` moves the ref callback from the wrapper to the
  `<ShareFrame>` element so the snapshot target is unambiguous.

This is the first step of the Phase 1 share-platform plan
(`~/.claude/plans/we-need-to-make-enumerated-cocke.md`); Commits 2–4 add
the `share-url` helper, `?tab=` deep-linking, and the `<ShareButton>` /
`<ShareModal>` primitives.

## Files Changed

- `src/components/solid/ShareFrame.tsx` — added `ref` prop on `ShareFrameProps`; attached on root div.
- `src/components/solid/VibeCard.tsx` — ref moved from wrapper to ShareFrame element.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 92/92 pass.
- Profile + home SSR returns 200.
- Manual: click share on a player profile → downloaded PNG now contains the
  rendered card frame (header + score + archetype + footer), not a blank.

## Result

Share download produces a real card image again. Foundation for the
upcoming ShareButton / ShareModal primitives — they'll wire the same `ref`
prop from the modal-mounted ShareFrame so the bug stays fixed when the
offscreen wrapper goes away.
