# 2026-05-14 — Profile route reads `?tab=` for share deep-links

## Goal

A shared link that includes `?tab=vibes` should land the recipient on the
Vibes Card, not the default News articles. Step 3 of the Phase 1 share
platform.

## What Was Done

- New `src/lib/utils/profile-tabs.ts` exports `deriveInitialTabs(tabParam)`
  — pure helper translating the optional URL param into the initial
  `{ mode, newsSubTab, statsSubTab }` signal values for ProfileContext.
  Six legal tab values (`news / x / vibes / stats / traits / compare`)
  map to the right mode + sub-tab; anything missing or unknown falls
  through to today's locked defaults.
- New `src/lib/utils/profile-tabs.test.ts` — four test cases covering
  defaults, news-mode tabs, stats-mode tabs, and case-insensitive parsing.
- `src/routes/profile.tsx` reads `searchParams.tab`, calls
  `deriveInitialTabs(...)`, and seeds the three signals from the result.
  `routeKey()` deliberately excludes `tab` so switching tabs in-app
  doesn't trigger a route remount; URL is read-on-init only.

## Files Changed

- `src/lib/utils/profile-tabs.ts` *(new)*
- `src/lib/utils/profile-tabs.test.ts` *(new)*
- `src/routes/profile.tsx` — read `?tab=` param; seed signals via helper

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 pass (98 + 4 new profile-tabs tests).
- `curl /profile?...&tab=vibes` → 200.
- `curl /profile?...&tab=traits` → 200.
- `curl /profile?...` (no tab) → 200, preserves today's defaults.

## Result

A recipient clicking `https://scoracle.com/profile?sport=NBA&type=player&id=237&tab=vibes`
lands directly on the Vibes Card. Same for `tab=traits / compare / stats / x / news`.
The `buildShareUrl(entity, "vibes")` helper from Commit 2 now produces URLs
that actually do something useful — Commit 4 will surface them through the
new ShareModal.
