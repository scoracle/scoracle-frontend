# 2026-06-05 — Specialist ("Special") card cleanup → share-friendly standout-skill card

## Goal

Tighten the Specialist card to a standard, share-friendly size and make it read clearly as
the entity's standout skill + strengths/weaknesses (the Traits tab's spiritual descendant).

## What Was Done

- **Removed the scarcity blurb** under the hero (irrelevant) and the **`/100` unit** on the
  hero percentile (self-explanatory) — the hero is now just the bold specialty label + its
  tier-colored score.
- **Added an intro line** `"{entity name}'s standout skill:"` above the hero (falls back to
  "Standout skill:" if the name hasn't resolved). Name comes from `getEntityMeta` (the same
  warm, server-resolved query EntityMeta uses), so it's correct on first paint.
- **Capped the secondary grid** to keep the card a fixed, share-friendly size: when an entity
  has more than 6 other in-spec skills, show only the **top-3 strengths + bottom-3 weaknesses**
  (≤6 → show all). Tier colors already read strength (green) → weakness (red), so no extra
  labels needed.

## Files Changed

`components/solid/SpecialistCard.tsx`, `components/solid/SpecialistCard.css`. (`scarcity`
stays — still used by the specialist OG body.)

## Verification

`typecheck` clean; `npm test` 97/97. Real worker (`cf:dev`) + Playwright on Wembanyama:
intro "Victor Wembanyama's standout skill:", hero "Rim Protection 100.0" (no `/100`, no
scarcity), 6-item grid (Rebounding/Foul Drawing/Scoring green → 3PT/Steals/Playmaking
blue+gold); zero console errors.

## Result

A compact, share-ready standout-skill card: bold specialty up top, strengths + weaknesses
below, fitting the standard card silhouette.

## Follow-up

The shared image (`/og/specialist/…`, `lib/cards/bodies/specialist.ts`) is a separate
hand-written SVG that still renders the scarcity line / full grid — aligning it with this
in-app layout is part of the Canvas-convergence work (task #17).
