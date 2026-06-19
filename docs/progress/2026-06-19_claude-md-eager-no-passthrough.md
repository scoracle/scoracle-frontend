# CLAUDE.md — eager-loading + no-passthrough doc lock

**Date:** 2026-06-19 · Frontend (docs only).

## Goal
Lock the conventions to the new fully-owned-data + eager-loading model so a future session/agent
doesn't re-derive the old lazy/sticky-mount model from the docs.

## What Was Done
- Design principle **#2** → "Cards own their data — end-to-end, no passthrough" (one `get<product>` per
  card against `api.scoracle.com`; no third-party calls rendered on read).
- Design principle **#3** "Lazy-load, sticky-after" → "**Eager-load — every Card, immediately**" (all
  cards mount on profile open and fetch in parallel; NavStrip toggles *visibility*, not fetching).
- Principle #4, the ContentShell + CARD_REGISTRY + Data-layer sections rewritten to the eager model;
  removed the stale `firePreloads`/`preload`-warm language and the stale `getNewsFeed`/`getTwitterFeed`
  merge-query note (the code already reads `getNews` → `/news`).
- Convergence-vocab fix in the share example (`VibeCard`/`"vibe"`/`"vibes"` → Sigil/`"sigil"`).

## Files Changed
`CLAUDE.md`.

## Verification
Docs only, no build. The code change that actually drops the `paneVisible` sticky-mount is **Phase C**
(tracked) — docs lead it by one phase by design.

## Result
Frontend conventions now declare the eager, owned-data model. Sticky-mount removal lands next.
