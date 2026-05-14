# 2026-05-14 — ContentShell: `.map(...)` → `<For>` keyed render

## Goal

While diagnosing a spazzing/CLS regression on profile pages, swap the
pane render from `PANES.map(...)` (unkeyed JSX-array) to `<For each>`
(keyed reconciliation). Even if the proximate cause of the regression
turned out to be dev-server / HMR state rather than the unkeyed array,
`<For>` is the canonical Solid pattern for iterating stable lists and
gives the reconciler explicit instructions on how to reuse pane DOM
across re-renders.

## What Was Done

`src/components/solid/ContentShell.tsx` — the pane render block:

```tsx
// Before
{PANES.map((pane) => (
  <Show when={mounted().has(pane.key)}>
    ...
  </Show>
))}

// After
<For each={PANES}>
  {(pane) => (
    <Show when={mounted().has(pane.key)}>
      ...
    </Show>
  )}
</For>
```

Imported `For` from `solid-js` alongside the other primitives.

## Files Changed

- `src/components/solid/ContentShell.tsx` — `.map` → `<For>` for the
  pane render block; `For` added to the `solid-js` import.

## Verification

- `npm run typecheck` — clean.
- `npm test` — 102/102 pass.
- Profile SSR returns 200 across `tab=stats`, `tab=x`, `tab=compare`.

## Result

Pane reconciliation now uses Solid's keyed `<For>` — semantically the
right way to iterate a stable list in Solid. CLS measured at 0 in the
spazzing-resolved state after this change landed.

The earlier spazzing root cause is still under investigation (it
returned to 0 after a hard reload + dev-server stabilization, which
suggests an HMR-state issue more than a code bug). Leaving the `<For>`
in place regardless because it's the better pattern.
