# 2026-05-14 — `<ShareButton>` + `<ShareModal>` platform primitives

## Goal

Land the share UX as a *platform* capability so any future Card —
TraitsCard, CompareCard, StatsCard (pizza charts), the eventual
PlayerCard — adopts share with a single `<ShareButton>` placement.
VibeCard is the first consumer; the abstraction proves out here.

Closes Phase 1 of the share-platform plan
(`~/.claude/plans/we-need-to-make-enumerated-cocke.md`).

## What Was Done

### New components

**`ShareButton.tsx` + `.css` — Layer A public API.** Renders the small
share-icon trigger and owns the modal lifecycle, the X/Facebook intent
URL builders, the html-to-image snapshot pipeline (Web Share API on
supported devices, download-to-disk fallback), and the canonical URL
via the shared `buildShareUrl()`. Caller-facing props are minimal:
`entity`, `tab`, `cardType`, `entityName`, `shareText`, `preview` (a
function returning the framed-card JSX). Optional `class` for
site-specific positioning; optional `ariaLabel`.

**`ShareModal.tsx` + `.css` — internal primitive.** Portal-mounted
dialog: scrollable preview area (where the framed JSX renders at
natural size — no transforms, so html-to-image captures the
un-distorted source), action row with four buttons (Share on X /
Share on Facebook / Copy link / Download image), focus management,
backdrop-click + Escape close. Not exported from any barrel — locked
behind ShareButton.

### VibeCard adoption

Stripped the ad-hoc share machinery from `VibeCard.tsx` — gone:
~70 lines including `handleShare`, the `sharing` + `shareOpen`
signals, the offscreen `<Portal>` + `<ShareFrame>` mount, the local
`ShareIcon`, the `toBlob` import. The card now declares share
intent in one block:

```tsx
<ShareButton
  entity={{ sport, type, id }}
  tab="vibes"
  cardType="vibe"
  entityName={readShareEntity(...)?.name ?? "Scoracle"}
  shareText={shareText()}
  preview={sharePreview}
  class="vibe-share-btn"
  ariaLabel="Share this vibe"
/>
```

`sharePreview()` returns a fresh `<ShareFrame>` wrapping `cardBody()`
on each call — the modal preview and the html-to-image capture share
the same JSX, no off-screen clone.

`.vibe-share-btn` in `VibeCard.css` shrank to four lines (position
absolute + z-index) — all the share-icon visuals come from `.share-btn`
in ShareButton.css.

### Bookkeeping

- Removed the dead `.share-frame-offscreen` rule from `ShareFrame.css`
  (no longer used; modal preview replaces it).
- Updated `ShareFrame.tsx` docstring to describe the modal-mounted
  flow.

## Files Changed

**New:**
- `src/components/solid/ShareButton.tsx` + `.css`
- `src/components/solid/ShareModal.tsx` + `.css`

**Modified:**
- `src/components/solid/VibeCard.tsx` — adopt `<ShareButton>`, drop
  ad-hoc share logic + local ShareIcon
- `src/components/solid/VibeCard.css` — trim `.vibe-share-btn` to
  positioning only
- `src/components/solid/ShareFrame.tsx` — docstring refresh
- `src/components/solid/ShareFrame.css` — drop `.share-frame-offscreen`

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 pass (no test changes; ShareModal snapshot
  test deferred — adding Solid component testing infra was bigger
  than warranted for Phase 1).
- `npm run dev` — Vite boots clean; home + profile SSR return 200;
  `?tab=vibes` lands on the Vibes Card.
- Manual: click share on a player's Vibe Card → modal opens with the
  framed card preview → X / Facebook / Copy link / Download all
  function → blank-PNG bug eliminated.

## Result

Share is a platform capability now. The next Card that wants share
needs:

1. One `<ShareButton>` placement with the entity, tab, share text,
   and a `preview` callback returning a `<ShareFrame>`-wrapped body.

No modal duplication, no URL builder duplication, no snapshot
plumbing. Phase 2 (server-side OG image route so social-platform
auto-previews show the rendered card) stays deferred per the locked
plan — it's purely additive on top of these primitives.
