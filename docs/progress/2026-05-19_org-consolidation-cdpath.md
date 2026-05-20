# 2026-05-19 — Consolidate org repos under ~/scoracle/, add bootstrap + CDPATH

## Goal

Make the cross-machine dev process clean and duplicatable. Work moves between
**archx220** and **archbox**; both should run the same layout, and provisioning
a fresh machine should be one command.

- Land every `scoracle` org repo as a sibling under `~/scoracle/` (was scattered
  at `~/scoracle-frontend`, `~/scoracle-data`, `~/scoracle-tokens` historically).
- Drop the legacy `albapepper/Scoracle` Astro references from `CLAUDE.md`. The
  legacy frontend was retired with the 2026-05-03 DNS cutover and is no longer
  needed locally; it survives as a milestone repo on the personal account.
- Add a `CDPATH` shortcut so `cd scoracle-frontend` works from anywhere.
- Ship a bootstrap script + setup doc so the new-machine procedure is one
  command, discoverable from the Obsidian vault.

## What Was Done

**Filesystem layout (this machine):**

- Created `~/scoracle/` parent dir.
- Moved `~/scoracle-frontend` → `~/scoracle/scoracle-frontend` (clean `mv`,
  preserved local hooks/state; git remote already pointed at
  `scoracle/scoracle-frontend`).
- Cloned the remaining 6 org repos as siblings: `scoracle-backend`,
  `scoracle-tokens`, `scoracle-wiki`, `scoracle-mobile-ui`, `scoracle-api-client`,
  `scoracle-types`. The last three are empty placeholders today.

**Shell:**

- Appended `export CDPATH=.:$HOME/scoracle` to `~/.bashrc`. `cd scoracle-frontend`
  now works from any cwd, with tab completion across sibling repos.

**Vault assets (in `~/scoracleWiki/`, synced via Obsidian — not in git):**

- `bootstrap.sh` — idempotent. Discovers all repos in the `scoracle` org via
  `gh repo list`, clones the ones missing under `~/scoracle/`, and appends the
  CDPATH line to `~/.bashrc` if absent. Prereq checks for `gh` (authed), `git`.
- `Setup.md` — canonical new-machine procedure: install prereqs (`pacman`),
  `gh auth login`, set `NODE_AUTH_TOKEN`, run `bootstrap.sh`, launch first
  session. Documents what lives where and why.

**CLAUDE.md updates:**

- This repo's `CLAUDE.md`: rewrote "Multi-directory session pattern" — new
  session command is `cd ~/scoracle/scoracle-frontend && claude --add-dir
  ~/scoracleWiki`. Clarified that `~/scoracleWiki` (Obsidian vault) is a
  separate thing from `~/scoracle/scoracle-wiki` (org milestone repo). Removed
  the legacy Astro mention in the opener and the `Don't modify ~/Scoracle`
  constraint. Added a "new machine?" pointer to the bootstrap script.
- `~/scoracleWiki/CLAUDE.md` (vault, outside this repo): repo table redone with
  the new local paths and an "all empty placeholder" row for the three stub
  repos. Dropped the legacy-Astro-frontend paragraph. New "Cross-machine setup"
  section points at `bootstrap.sh` and `Setup.md`.

## Files Changed

In this repo (staged for commit):

```
CLAUDE.md
docs/progress/2026-05-19_org-consolidation-cdpath.md  (this doc, NEW)
```

Outside this repo (Obsidian-synced, not version-controlled):

```
~/scoracleWiki/CLAUDE.md     (modified)
~/scoracleWiki/bootstrap.sh  (NEW, executable)
~/scoracleWiki/Setup.md      (NEW)
```

## Verification

- **Bootstrap idempotency.** Re-ran `~/scoracleWiki/bootstrap.sh` after the
  initial setup: every repo reported `(already cloned, skipping)`, CDPATH
  reported `(already set)`. Exit 0.
- **CDPATH active.** In a fresh interactive shell starting from `$HOME`,
  `echo $CDPATH` → `.:/home/scotty/scoracle`; `cd scoracle-frontend` → resolves
  to `/home/scotty/scoracle/scoracle-frontend`.
- **Git state intact.** `git remote -v` in `~/scoracle/scoracle-frontend` still
  points at `https://github.com/scoracle/scoracle-frontend`. `git status` clean
  on `main`, fully tracking `origin/main`. The 102-test suite hasn't been
  touched — no code paths changed in this commit, only `CLAUDE.md` + the new
  progress doc.
- **Org coverage.** `gh repo list scoracle` returns 7 repos; all 7 are cloned
  under `~/scoracle/`. Four have content (frontend, backend, tokens, wiki),
  three are recognised empty placeholders.

## Result

Single command provisions a new machine:

```bash
~/scoracleWiki/bootstrap.sh
```

The Obsidian vault carries everything needed to replicate the setup — script
and doc are both in the vault, so they sync across archx220 and archbox via
Obsidian without any chicken-and-egg cloning step. From a fresh machine, the
flow is: install prereqs → `gh auth login` → export `NODE_AUTH_TOKEN` → run
bootstrap → open a new shell → `cd scoracle-frontend && claude --add-dir
~/scoracleWiki`.

The legacy `~/Scoracle` (Astro) and `~/scoracle-data` (pre-rename backend)
paths no longer appear anywhere in active docs.
