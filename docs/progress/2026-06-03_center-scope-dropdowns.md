# 2026-06-03 — Center the scope-row dropdowns

## Goal

The scope selectors (year + scope) were right-aligned; center them.

## What Was Done

`.scope-row` in `ContentShell.css`: `justify-content: flex-end` → `center`.

## Files Changed

`src/components/solid/ContentShell.css`.

## Verification

CSS-only; `vite build` clean via `cf:deploy`.

## Result

Year + scope dropdowns centered in the row below the tabs.
