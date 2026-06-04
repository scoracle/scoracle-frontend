# 2026-06-03 — Declutter the share-card frame (drop footer + separators)

## Goal

Per Scott: the card reads cleaner without the footer URL, the hairline above it, and the
hairline between the meta header and the card body. Remove them.

## What Was Done

- **`build-card.ts`**: dropped the footer band entirely (the canonical-URL line, the date/
  card-type line, and the divider above them) and the header↔body separator hairline. With
  the URL gone, the leftover date/card-type label was orphaned, so the whole footer goes —
  the vibe card's date still lives in its own body credit row, so no info is lost. Removed
  the now-unused `canonicalUrl` / `footerRight` / `hideFooter` inputs.
- **OG handler**: stopped building `canonicalUrl` / `footerRight`; dropped the `tabForCard`
  helper (only the footer used it). buildCardSvg now takes just `innerSvg / frameInnerSvg /
  primary / cornerLabel`.
- **`og-bodies.ts`**: removed the now-dead `date` / `hideFooter` from `OgBody` and the body
  fns (+ the unused `formatDate` import).

## Files Changed

`lib/og/build-card.ts`, `routes/og/[cardType]/…/[id].ts`, `lib/cards/og-bodies.ts`.

## Verification

`npm run typecheck` clean; `npm test` 97/97; local rasterize (real data + wasm/fonts)
confirms: no footer, no separators — just header + body + tarot border. `npm run build` clean.

## Result

The share card is header + body + border + corner numerals. No URL, no hairlines — cleaner,
more brand-forward. Card-internal attribution stays off the card (Share Frame Rule 2 intact;
the canonical link still travels with the share via the page URL, not printed on the image).
