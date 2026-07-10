# 2026-07-10 - Solid-Optimized Cleanup Follow-Up

## Direction

The AdSense fix proved the boundary we want long-term:

- SSR owns crawler/review-safe route content.
- SolidStart owns normal browser hydration.
- Eager product warmup remains core, but starts after the route/entity contract is known.
- Non-critical product work cannot replace the route shell or crawler-useful HTML.

## Follow-Up Audit

Do one focused cleanup pass to remove remaining Astro-inspired patterns that do
not fit SolidStart:

- Find skeleton-only SSR paths and replace them with useful server-rendered route
  content or explicit post-hydration enhancements.
- Move crawler-critical fetches/metadata into route preload or server-owned data
  contracts.
- Keep cards responsible for their own product fetch/render paths, with local
  error boundaries for non-critical failures.
- Retire duplicated lazy/island-style gates where Solid resources and Suspense
  already model the dependency cleanly.
- Preserve eager loading by warming all product surfaces after the active
  route/entity is resolved, not before SSR has a useful document.
- Add browser smoke coverage for:
  - no-JS SSR content
  - AdSense/review SSR-only mode
  - hydrated top-level eager warmup

## Goal

End state should feel simpler:

- crawlers get complete SSR HTML
- users get full Solid hydration and fast warmed tabs
- product failures stay local
- the app no longer carries Astro-era skeleton/lazy-island assumptions

