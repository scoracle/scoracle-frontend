# 2026-06-03 — Soup up the share card: centered meta header + corner id

## Goal

Per Scott: the share card should look like the regular in-app card — accent border lines,
the id numbers in the corners, brand-consistent, no hairline dividers, **meta centered at
the top**, no footer.

## What Was Done

- **Centered header** (`build-card.ts`): replaced the old top-left photo+text block with a
  centered column mirroring the in-app `EntityMeta` `.pw-content` — portrait photo on top,
  name centered (PT Serif 52), team subtitle centered in **uppercase + letter-spacing**
  (matching `.pw-subtitle`). Photo bumped to 130px for share-card presence.
- **Corner id** (handler): the corner numeral now defaults to the **entity id**
  (`resolved.cornerLabel ?? id`) — same as the in-app card's corner slot — so every card
  carries the id at TL (upright) + BR (rotated 180°). A card that sets its own mark (the
  vibe archetype numeral) still wins.
- The accent tarot border was already shared (`weathered-tarot-border.svg` =
  `.card::before`); dividers + footer were already gone. Removed the now-dead compare
  two-up header path (`compared` input + `composeHeader`).

## Files Changed

`lib/og/build-card.ts` (centered header, drop compare two-up), `routes/og/[cardType]/…/[id].ts`
(corner id fallback).

## Verification

`npm run typecheck` clean; local rasterize with real data + photo + wasm/fonts shows the
centered photo/name/caps-team header, the id in both corners, the tarot border, no
dividers/footer. Live verification post-deploy across composite / vibe / team / meta.

## Result

The OG share card now reads as the brand card: centered entity portrait + name + team up
top, accent border, corner ids, the card body below. Consistent with the in-app surface.
Next soup-up options if wanted: circular photo mask, team-crest accent alongside the photo.
