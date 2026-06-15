# 2026-06-15 — Profile: simplify to eager-load reactive islands

## Goal
Replace the keyed-remount "instant-nav" model with the simplest eager-load structure — the route
stays mounted and islands re-fetch reactively on entity change. The foundation for the two-rail
(B6) frontend work.

## What Was Done
- `profile.tsx`: removed the per-entity keyed `<For>` remount and the post-hydration "defer one tick
  / paint the shell first" instant-nav hack (and the `Suspense` / `For` / `isServer` imports it
  needed) — ~90 lines gone.
- Cross-entity navigation now keeps the route mounted; `EntityMeta` + every Card re-fetch reactively
  via `firePreloads` (on `onMount` and `createEffect(on(id, …))`) — only the surface whose data
  changed is touched, none remount.

## Files Changed
- `src/routes/profile.tsx` (8 insertions, 90 deletions)

## Verification
- `npm run typecheck` clean.

## Result
The simple eager-load foundation for B6: on entity load every card's `query()` is warmed; each card
renders a slice of its rail (rails own the data, cards own the presentation).
