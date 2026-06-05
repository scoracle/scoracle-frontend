# 2026-06-04 — Soup up the OG header: circular photo + team-crest badge

## Goal

Make the share-card header more premium: circle-mask the player headshot and show the
team crest alongside it (both already available in the local meta).

## What Was Done

- **`build-card.ts` `composeCenteredHeader`:** when `round` is set (player headshots), the
  photo is clipped to a circle (`clipPath` + `slice` so it fills, edges cropped) with a thin
  ring; a **team-crest badge** (cream circle + ring + contained crest) sits on the lower-right
  rim. `CardEntityFacts` gains `crestDataUri?` + `round?`. Team logos / no-photo fallbacks
  keep the contained (un-masked, no-badge) treatment — a crest's silhouette is its identity.
- **`entity-facts.server.ts`:** players resolve `{ imageUrl: photo, crestUrl: team logo,
  round: true }` when a headshot exists, else `{ imageUrl: crest, round: false }` (NBA/NFL
  have no `photo_url`). Teams → `{ imageUrl: logo, round: false }`.
- **OG handler:** loads the crest data-URI in parallel with the photo and passes
  `crestDataUri` + `round` into the header.

## Files Changed

`lib/og/build-card.ts`, `lib/og/entity-facts.server.ts`, `routes/og/[cardType]/…/[id].ts`.
(Also ships the post-fix hygiene commit + the async-SSR fix.)

## Verification

`npm run typecheck` clean; `npm test` 97/97; local rasterize (real photo + crest) shows the
circular headshot + ring + crest badge. Live-verified post-deploy across player (real crest) /
team (contained logo) / NBA player (no-photo → contained crest).

## Result

Player share cards now lead with a circular headshot + team-crest badge — more brand-forward.
Teams + photo-less players keep the clean contained logo.
