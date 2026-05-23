# 2026-05-23 — Shell padding uniform

## Goal

Make Shell's internal padding uniform on all sides. Previous value (`1.25rem 1.5rem`,
i.e. 20px vertical / 24px horizontal) gave subtly different breathing room top/bottom
vs left/right; the contract is "uniform appearance" so the padding itself should be
uniform too.

## What Was Done

Picked the horizontal value (`1.5rem` / 24px) as the canonical inset and applied it
on all four sides. Updated the Shell docstring to match.

## Files Changed

- `src/global.css` — `.shell { padding: 1.25rem 1.5rem }` → `padding: 1.5rem`
- `src/components/solid/Shell.tsx` — docstring at the top of file refreshed to
  describe the new uniform value

## Verification

- `npm run typecheck` — clean
- `npm test` — 119/119 passing

## Result

Every Shell now sits at a uniform 24px inset. The uniform-appearance guarantee
in the docstring is now literally true at the CSS level.
