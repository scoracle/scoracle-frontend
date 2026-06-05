# 2026-06-04 — Post-fix hygiene

## Goal

Tidy loose ends after the blank-profile fix.

## What Was Done

- **Dropped the now-redundant `deferStream: true`** on the route's `getEntityMeta` createAsync
  — async SSR (`mode: "async"`) already awaits all resources before flushing, so head tags
  land in the initial HTML regardless. Updated the comments that referenced `deferStream`
  (profile.tsx, app.tsx, EntityMeta.tsx, entry-server.tsx) to point at async mode.
- **aria labels:** SpecialistCard's resolved + skeleton `aria-label` "Specialist" → "Special"
  (the client label). (Left the CompositeCard skeleton's neutral "Composite" — the skeleton
  is type-agnostic; the resolved facets already use the client labels via `facetLabel`.)
- **Honest record:** added a correction note to the `reactive-profile-params` progress doc —
  that refactor was sound but did NOT fix the blank; async SSR did.

## Files Changed

`routes/profile.tsx`, `app.tsx`, `components/solid/EntityMeta.tsx`, `entry-server.tsx`,
`components/solid/SpecialistCard.tsx`, progress docs.

## Verification

`npm run typecheck` clean; `npm test` 97/97. No behavior change (comments / aria strings /
no-op option removal). Ships with the next feature deploy.

## Result

Comments reflect async SSR; specialist aria matches the client label; the progress-doc record
is accurate.
