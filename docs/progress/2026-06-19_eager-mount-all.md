# Frontend eager mount-all — drop the paneVisible sticky-mount

**Date:** 2026-06-19 · Frontend.

## Goal
Complete the eager-loading migration on the live flagship: every profile card mounts on open and
fetches its product immediately, instead of the old lazy sticky-mount (a card body mounted only on
first tab activation). Now valid because every product is a fast precomputed read we own — the slow
passthrough News feed that the lazy gate existed to defer (its own comment cited "~12s cold") is gone.

## What Was Done
- `ContentShell.tsx`: removed the `paneVisible` mount-gate + the `<Show when={paneVisible}>` wrapper so
  **all** card panes render (mount) on profile open; each card's `createAsync` fires on mount → the full
  product fan-out goes out in parallel and each card renders as received. Replaced the `mounted`
  `{key, tabs}` sticky-set with a minimal `epoch` signal that only drives which *mounted* pane is
  **visible** (`effectiveActive` → the `.active` class + nav highlight). Transition correctness (the
  `landingTab` fallback on the first render after an entity navigation) is preserved.
- `ContentShell.css`: updated the pane comment (sticky-mount → eager-mount); the
  `.content-shell-pane { display:none }` / `.active { display:flex }` rules are unchanged — they now hide
  the non-active *mounted* panes (an instant CSS flip between already-mounted cards).

## Files Changed
`src/components/solid/ContentShell.tsx` · `src/components/solid/ContentShell.css`.

## Verification
`npm run typecheck` clean · `npm test` **113/113** pass · `npm run build` OK. (Runtime/visual check of
the parallel fan-out available on request — needs the dev server + backend.)

## Result
The flagship now eager-loads: all cards mount + fetch on profile open, render as received; NavStrip is a
visibility toggle, not a fetch gate. Matches the conventions locked in the doc commit `d112a63`, and is
sequenced after the backend eager-blockers (`195c8f1`).

Note: `profile.tsx`'s onMount `firePreloads` is now redundant (cards fetch on mount; `query()` dedups) —
left in place (harmless; the route `preload` hover-warm is still useful) — tracked as ledger **O26**.
