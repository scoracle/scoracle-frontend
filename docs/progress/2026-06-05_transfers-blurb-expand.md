# 2026-06-05 — Transfers card: tap-to-expand Gemma blurb

## Goal

On the profile Transfers tab, Gemma's grounded summary was truncated to one line
(`text-overflow: ellipsis`), so users couldn't read the full rumor. Add an expand option.

## What Was Done

- `TransfersCard`: wrapped the `.transfers-meta` sub-line in a bare toggle button
  (`.transfers-meta-btn`) with a `⌄` chevron affordance. Tapping it expands the blurb —
  the meta switches from `white-space: nowrap` + ellipsis to wrapping the full
  `stage · gemma_summary · per source_attribution`; tapping again collapses. The chevron
  flips to `⌃` while open.
- Open state is a `createSignal<ReadonlySet<number>>` keyed by row `rank`, so multiple
  rows can be open independently.
- The player **name remains its own `<a>`** (tapping the name still navigates to the
  player profile); only the blurb toggles. Heat column stays aligned.
- `prefers-reduced-motion` disables the chevron transition.

## Files Changed

`components/solid/TransfersCard.tsx`, `components/solid/TransfersCard.css`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker (`cf:dev`) + Playwright on a Chelsea
team profile (19 rumor rows): each row has a chevron; clicking a blurb opens exactly that
row and reveals the full summary (e.g. "Concrete interest · Multiple sources suggest
Chelsea are targeting Jarrod Bowen, with reports citing West Ham sources … · per Sky
Sports"); zero console errors. Approved by Scott.

## Result

Rumor blurbs are readable in full on demand without bloating the dense ranked list.
(The dedicated `/leaderboard` Transfers board stays the compact `team · direction · stage`
view — no blurb there by design.)
