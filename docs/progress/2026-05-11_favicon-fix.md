# 2026-05-11 — Favicon 404 fix (Scoracle-themed SVG)

## Goal

Fix the 404 on `/favicon.svg` (referenced from `entry-server.tsx` but
never shipped) with a Scoracle-themed asset rather than removing the
reference.

## What Was Done

Added `public/favicon.svg` — a 224-byte minimal SVG distilling the
Scoracle main-logo crystal ball at favicon scale: a midnight-indigo
(`#1A1F3A`) sphere with a soft white highlight evoking the polished
crystal of the main logo. The original `scoracle_crystal_ball.png`
(168KB, fine hand-drawn line art) was unsuitable for favicon use —
size penalty + would degrade to noise at 16×16. The SVG scales
cleanly at any size.

## Files Changed

- `public/favicon.svg` (new, 224 bytes)

## Verification

- `curl -I http://localhost:5173/favicon.svg` returns 200 (after dev
  restart) / browser tab shows the crystal-ball glyph after refresh.

## Result

404 cleared. Brand-coherent favicon shipped at a tiny footprint.
