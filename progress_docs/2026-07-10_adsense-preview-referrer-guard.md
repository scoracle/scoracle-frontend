# 2026-07-10 - AdSense Preview Referrer Guard

## Goal

Stop AdSense preview from reaching SolidStart's client fallback after the prior cross-origin iframe guard proved too narrow.

## What Changed

- Broadened `src/entry-client.tsx` hydration skip detection:
  - cross-origin frames still keep SSR
  - Google-owned ancestor origins keep SSR
  - AdSense/ad-preview referrers keep SSR
  - Google crawler/review user agents keep SSR if they execute the client bundle
- Added a `data-scoracle-hydration="skipped-review-preview"` marker when the client intentionally preserves SSR.

## Verification

- `npm run typecheck`
- `npm run cf:build`

## Result

Normal top-level users still hydrate through SolidStart. AdSense/Google preview and review surfaces have more ways to be recognized before `StartClient` can replace useful SSR with the framework fallback.
