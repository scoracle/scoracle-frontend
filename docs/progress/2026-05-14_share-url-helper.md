# 2026-05-14 — `share-url.ts` helper + `tab=` baked in

## Goal

Centralize the canonical-URL builder so every shareable Card uses the same
shape, and bake in a `tab=` hint that the profile route can read on init to
land recipients on the exact Card the sender shared. Step 2 of the Phase 1
share platform.

## What Was Done

- New `src/lib/utils/share-url.ts` exports `buildShareUrl(entity, tab?)`
  plus `ShareTab` (`news | x | vibes | stats | traits | compare`) and
  `ShareEntity` types. Upper-cases sport, preserves type/id casing, appends
  `tab=...` only when supplied, falls back to `https://scoracle.com` when
  `window` is undefined (SSR-safe).
- New `src/lib/utils/share-url.test.ts` — six tests covering casing, tab
  inclusion / omission, every legal tab value, and the SSR origin fallback.
- `src/components/solid/VibeCard.tsx` — local `buildCanonicalUrl` deleted;
  both call sites now use `buildShareUrl({ sport, type, id }, "vibes")`.
  This is the first place `&tab=vibes` gets baked into a shared URL.

## Files Changed

- `src/lib/utils/share-url.ts` *(new)*
- `src/lib/utils/share-url.test.ts` *(new)*
- `src/components/solid/VibeCard.tsx` — drop local helper, import shared

## Verification

- `npm run typecheck` — clean.
- `npm test` — 98/98 pass (92 existing + 6 new share-url tests).
- Profile SSR returns 200.

## Result

One canonical URL builder for every future shareable Card. TraitsCard,
CompareCard, StatsCard will call `buildShareUrl(entity, "traits" | "compare"
| "stats")` when they adopt `<ShareButton>`. `?tab=vibes` is now embedded
in every URL the VibeCard share path produces — Commit 3 will wire the
profile route to actually read it.
