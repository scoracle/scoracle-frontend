# 2026-05-23 — Session-start branch-sync convention

## Goal

Encode "confirm local branch is synced with origin/main" as the **first
step of every coding session** in any scoracle-org repo, so future
sessions catch divergence before editing instead of after.

## What Was Done

Added a "Session start" section as the **top** section of three places:

- `scoracle-frontend/CLAUDE.md` — top of file, ahead of "Multi-directory
  session pattern." Project-scoped instruction lands in context
  automatically when a session starts here.
- `~/scoracleWiki/wiki/CONVENTIONS.md` — top of file, ahead of "What
  belongs here." Cross-repo durable signal in the vault. Mirrors the
  CLAUDE.md text and references CLAUDE.md as the in-repo half.
- Memory: `session-start-branch-sync.md` (feedback type). Belt-and-
  suspenders — the rule applies even if CLAUDE.md / CONVENTIONS.md aren't
  read at session start.

## Files Changed

- `CLAUDE.md` (scoracle-frontend)
- `~/scoracleWiki/wiki/CONVENTIONS.md` (vault, no git)
- `~/.claude/projects/-home-sheneveld-scoracle-frontend/memory/session_start_branch_sync.md` (new)
- `~/.claude/projects/-home-sheneveld-scoracle-frontend/memory/MEMORY.md` (index updated)

## Verification

Sources of the rule cross-reference each other so future-me will find it
from any of: opening the repo (CLAUDE.md), browsing the vault
(CONVENTIONS.md), or starting a session via memory.

## Result

Step 1 of every future session: `git fetch && git status`. If diverged
in either direction, stop and confirm the plan with the user before
editing. Same rule applies across all `~/scoracle/*` repos.

The trigger: this session started without a branch-sync check, landed 3
commits of work that conflicted with origin's butterfly-split commits,
and ended up needing a stashed-WIP + merge anyway. The check would have
caught it for free — see companion progress doc
`2026-05-23_merge-origin-butterfly.md` for the merge details.
