# Pillar vs feature clarity — the org architecture vision crystallized

**Date:** 2026-05-02
**Scope:** Strategic clarity session. No code changes yet — vision documented in vault, peel-back implementation plan approved, ready to execute.

## Goal

Lock in the org-level mental model that's been building across recent sessions, so the remaining flagship work + the eventual `@scoracle/ui` extraction proceed against a clear, shared frame. The chaos of "what goes where, when does it get extracted, why are we still iterating in `scoracle-frontend`" resolves once the pillar-vs-feature line is sharp.

## What Was Done

### Vision: pillar repos vs feature repos

The org has two kinds of repos. **Pillar repos carry the framework** (the visual + behavioral primitives, the cross-site shell, the design tokens). **Feature repos carry the products** (the scope-specific tabs and features that make each site uniquely itself).

The line that keeps it clean: **`@scoracle/ui` ships the shapes; project repos ship the meaning.**

- `<TabContainer>` is a pillar primitive — it doesn't know what a "tab" *is*; it renders whichever tabs the project hands it.
- `<Card>` is a pillar primitive — it doesn't know what's inside it.
- `NewsCard` and `StatsCard` are *compositions* of pillar primitives — they live in `scoracle-frontend` because they're flagship-specific arrangements, not portable shapes. Sandbox doesn't have a StatsCard; it has a LineupCard. Same `<TabContainer>` underneath, different tabs passed in.

**Pillar repos:**
- `@scoracle/tokens` — design tokens (CSS custom properties only). Live.
- `@scoracle/ui` — visual primitives + cross-site shell + shared data utilities. Deferred extraction; built extract-ready.
- `@scoracle/auth` *(future)*.

**Feature repos:**
- `scoracle-frontend` — `CrystalBallSelector`, `EntityMeta`, `NewsCard`/`StatsCard` compositions, and their tabs.
- `scoracle-sandbox` — `LineupSelector` + lineup-specific cards/tabs.
- `scoracle-fantasy`, `scoracle-stats`, `scoracle-ai` — same pattern, different domains.

### Why defer `@scoracle/ui` extraction

The instinct to "build the pillar first so flagship is just feature work" is appealing — but the math is off. Every phase of the upcoming peel-back plan happens in `scoracle-frontend` regardless of where `<TabContainer>` lives:

- **Phase 1 (flip-card removal)** is flagship-only cleanup; not a pillar concern.
- **Phase 2 (TabContainer thunk + Show)** is the same code change whether it lives in `@scoracle/ui` or in `scoracle-frontend`.
- **Phase 3 (lazy() per tab)** is project-side card code; stays in flagship.

The hidden cost of extracting now: iterating on a package with one consumer locks in API shapes that haven't been pulled on yet. Two consumers (flagship + sandbox) reveal which seams are real. Until then, primitives live extract-ready inside `scoracle-frontend`. When sandbox kicks off, extraction is one focused day of `git mv` + repo bootstrap.

### The tab is the unit of reuse

For the pillar/feature split to hold, each **tab** must be self-contained:

1. Own its mount lifecycle (mount on activation, not parent render)
2. Own its data fetches (`createAsync(() => getX(...))` on activation)
3. Own its loading state (`<Suspense fallback={<Skeleton/>}>`)
4. Own its code chunk (`lazy(() => import("./X"))`)

Today's flagship has 1–3 in good shape (commit 48c21a8 aligned all tabs to `createAsync` + per-component Suspense). The peel-back plan finishes the job: Phase 1 strips a flagship-specific flip mechanism, Phase 2 cuts parent-driven mounting, Phase 3 lands per-tab code-splitting.

After that, flagship is exactly what the user described — focused on its features, not its presentation/structure.

### The approved peel-back plan

`/home/sheneveld/.claude/plans/good-job-i-want-harmonic-micali.md` — three phases, ~150 lines of mechanical complexity to remove. Documented separately; this progress doc captures the strategic context behind it, not the implementation detail.

## Files Changed

**Vault (architecture)**
- `~/scoracleWiki/wiki/Architecture/Platform Architecture.md` — added "Pillar repos vs feature repos" section, restructured "Repo structure" into pillar/feature/infrastructure groupings, added defer-extract rationale to build order
- `~/scoracleWiki/wiki/Architecture/Component Strategy.md` — added "The tab is the unit of reuse" section, updated provenance to capture today's clarity session

**Plan**
- `/home/sheneveld/.claude/plans/good-job-i-want-harmonic-micali.md` — peel-back simplification plan with org-level vision threaded in (approved by user)

**Progress (this doc + vault mirror)**
- `docs/progress/2026-05-02_pillar-vs-feature-clarity.md`
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-02_pillar-vs-feature-clarity.md`

## Verification

- Vault docs read cleanly end-to-end; cross-references resolve (`[[Platform Architecture]]`, `[[Component Strategy]]`).
- Pillar/feature framing is consistent across Platform Architecture, Component Strategy, and the approved peel-back plan.
- The build order in Platform Architecture explicitly sequences peel-back (May 2026 in `scoracle-frontend`) → cutover → extraction (when sandbox kicks off).

## Result

The mental model is locked. `scoracle-frontend` is a feature repo focused on entity-profile features. `@scoracle/ui` will eventually ship the shapes that `scoracle-frontend`, `scoracle-sandbox`, `scoracle-fantasy`, `scoracle-ai` all compose against. The bridge between today (one consumer, primitives inline) and that future (two+ consumers, primitives extracted) is **build extract-ready, defer extraction, run the peel-back to make extraction mechanical.**

Next: execute the peel-back plan. Phases 1–3 in `scoracle-frontend`. Then DNS cutover. Then `@scoracle/ui` when sandbox starts.
