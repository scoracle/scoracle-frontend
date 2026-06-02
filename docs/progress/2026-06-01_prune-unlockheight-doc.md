# 2026-06-01 — Prune stale `unlockHeight` from CLAUDE.md

## Goal

Remove the dead `unlockHeight` Shell-prop references from this repo's `CLAUDE.md`.
The prop was removed from `<Shell>` on 2026-05-20 (shell-rewrite-antique-tarot),
but `CLAUDE.md` still documented it as a current API — which is what led to a
typecheck error when it was used on the new Leaderboard/Roster cards earlier today.

## What Was Done

Updated the three live `CLAUDE.md` references (the Shell vocabulary row, the Card
convention code example ×2, and the prose line) to describe the actual API:
`<Shell>` has **no height props** — the 380×320 shape is a `min-height` floor that
grows to fit taller content. Historical `docs/progress/*.md` are left untouched —
they correctly record the prop's lifecycle at the time it existed.

## Files Changed

```
CLAUDE.md
```

## Verification

- `grep unlockHeight` across live files (tsx/ts/css/md, excluding docs/progress) → 0.
- No code touched; `Shell.tsx` + CSS already carried no references.

## Result

CLAUDE.md now matches the real Shell API — no phantom opt-out to trip over next time.
