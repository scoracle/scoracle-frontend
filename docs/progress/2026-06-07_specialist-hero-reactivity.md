# 2026-06-07 — Fix Specialist hero stuck / carrying over

## Goal
On the Special tab the primary "standout skill" was stale: it carried over from one
entity to the next (e.g. Steals from one NBA player onto another), and when toggling
Per-X / season the secondary traits updated but the primary hero did not.

## What Was Done
`components/solid/SpecialistCard.tsx`: the `<Show when={rating() && hero()}>` used a
non-keyed children callback that captured `const h = hero()!` once. A non-keyed
`<Show>` only re-runs its children when `when` flips falsy↔truthy — and since the
card is sticky-mounted and `hero()` stays truthy across entity/rate/season changes,
the block never re-ran, freezing the primary hero (label + pct + art). The secondary
grid updated because `<For each={shown()}>` reads `shown()` reactively in JSX.

Fix: make the Show **keyed on `hero()`** — `<Show when={hero()} keyed>{(h) => …}`.
Keyed re-runs the block (recomputing `h` and `HeroArt`) whenever the hero datapoint's
identity changes, which is exactly when the entity, rate mode, or season changes
(and stays stable otherwise, so no needless re-render). Dropped the redundant
`rating()` term — `hero()` is null without a rating.

## Files Changed
`src/components/solid/SpecialistCard.tsx`.

## Verification
`npm run typecheck` clean; `npm test` → 111 pass. Browser (dev), client-side changes
(the failing path — full reloads remount and would mask it):
- Player 177 Special: "Foul Drawing 80.6" → toggle Per 36 → "Foul Drawing **82.9**"
  (primary now updates).
- Search-nav to Aaron Holiday (213) → Special → "Playmaking 66.4" (no carry-over from
  177's Foul Drawing).

## Result
The Specialist hero re-derives on every entity navigation and every Per-X / season
toggle, in lockstep with the secondary traits.
