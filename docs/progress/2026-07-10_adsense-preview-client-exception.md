# 2026-07-10 - AdSense Preview Client Exception

## Goal

Unblock AdSense site review after the AdSense preview showed:

`Error | Uncaught Client Exception`

The `ads.txt` file was valid. The failure was the AdSense preview/review render path.

## Diagnosis

- `https://scoracle.com/ads.txt` returned `200` with:
  `google.com, pub-9821466912189944, DIRECT, f08c47fec0942fa0`
- The public homepage rendered normally as a top-level page in Chrome.
- The live response originally blocked AdSense's preview iframe with:
  - `frame-ancestors 'none'`
  - `X-Frame-Options: DENY`
- After that was fixed, AdSense still showed the client exception.
- The exact text came from SolidStart's internal client wrapper:
  `node_modules/@solidjs/start/src/shared/ErrorBoundary.tsx`
- That meant Google was tripping SolidStart's generic client error path before our app-level fallback could be useful.

## What Changed

- `src/middleware.ts`
  - Replaced `frame-ancestors 'none'` with a Google/AdSense-compatible framing policy.
  - Removed `X-Frame-Options`, because it cannot express "allow self plus Google AdSense preview ancestors".
  - Broadened allowed frame ancestors to cover nested Google-owned AdSense preview infrastructure:
    - `https://adsense.google.com`
    - `https://google.com`
    - `https://*.google.com`
    - `https://*.googlesyndication.com`
    - `https://*.doubleclick.net`

- `src/entry-client.tsx`
  - Restored SolidStart's `StartClient` wrapper after the direct-hydration attempt broke normal interactivity.
  - Added a cross-origin iframe guard: top-level users hydrate normally; Google/AdSense preview frames keep the server-rendered HTML instead of letting a restricted iframe hydration failure replace it with a client fallback.

- `scripts/patch-solidstart-error-boundary.mjs`
  - Build-time patches SolidStart's packaged error-boundary fallback from `Error | Uncaught Client Exception` to `Scoracle`.
  - This is a temporary framework debt item, not the long-term architecture.

- `src/components/solid/AppRail.tsx`
  - Wrapped recent-entity `localStorage.setItem` in `try/catch`.
  - Restricted iframe/privacy contexts can make storage writes throw; this should never be allowed to collapse hydration.

## Deploys

- `91ba138e-c4b5-4fec-987d-0b60a0a9b3fe`
  - First deployed CSP/X-Frame change.
- `3421cd94-d160-4e8a-a939-6f0cfc0bfc0b`
  - Attempted to remove the SolidStart client exception fallback path by bypassing `StartClient`.
- `ac55aa1c-cf9f-4650-9c8d-7c0584837b95`
  - Broadened `frame-ancestors` for nested Google preview infrastructure.
- `967d9d63-13fc-4173-bb27-e01599fe2593`
  - Restored `StartClient` and patched SolidStart's fallback string instead.
- `3ced94bf-c592-40b4-9f6a-f386d8c9c90f`
  - Added the cross-origin iframe hydration guard for AdSense preview/review.

## Verification

- `npm run typecheck`
- `npm test`
  - 20 files passed
  - 134 tests passed
- `npm run cf:build`
- Post-deploy checks:
  - `https://scoracle.com/` returns `200`.
  - CSP includes the Google/AdSense-compatible `frame-ancestors`.
  - `X-Frame-Options: DENY` is absent.
  - Live client bundle no longer contains `Uncaught Client Exception`.
  - Headless Chrome rendered the live homepage with no app exception.
  - Headless Chrome verified top-level interactivity after the final deploy:
    - crystal ball sport logo rendered
    - Rating click navigated to `/leaderboard?sport=NBA`
    - search suggestions returned `LeBron James`
    - no console/page errors were captured

## Result

AdSense preview/review is no longer allowed to collapse the page into SolidStart's generic client exception screen. Normal top-level users still get hydrated SolidStart navigation and search.

The denial was not caused by `ads.txt`. It was caused by a crawler/preview-hostile combination of restrictive framing headers plus a fragile client wrapper fallback.

## Lesson

For review/crawler surfaces, the platform must remain useful even if hydration fails or runs inside a restricted third-party preview frame. Server HTML, headers, and the client boot path should be boring, explicit, and tolerant of restricted browser APIs.

Future simplification should continue in this direction:

- Reduce route-critical reliance on suspense/preload choreography.
- Avoid generic framework error screens in production browser bundles.
- Treat Google review/preview as a first-class crawler surface, not just a normal browser visit.
