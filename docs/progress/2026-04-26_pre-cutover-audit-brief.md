# Audit Brief — scoracle-frontend pre-DNS-cutover review

**Date drafted:** 2026-04-26
**Drafted by:** the prior session that built Phases 0–4. Self-handoff to a fresh session for an unbiased review before the production DNS cutover.

> **You (the fresh session):** read this top-to-bottom before touching anything. It contains the audit scope, the project state, what's intentionally shaped (don't "fix"), where the prior session has low confidence, and the output format expected. Pasted as a first prompt, this should be enough to start work without further questions.

## Why this document exists

`scoracle-frontend` is a greenfield SolidStart 2.0-alpha + Solid 1.9.11 build that's complete enough to flip DNS — `scoracle.com` is currently served by the legacy `albapepper/Scoracle` Astro 6 worker, and the new SolidStart worker is live + smoke-tested at `https://scoracle-frontend.albapepper.workers.dev`. Functional parity confirmed by the user via side-by-side browser testing.

Before the DNS cutover (one CF dashboard route flip away), the user wants a thorough audit of the codebase by a session that **didn't build it**. The prior session has self-review bias and will instinctively defend its own decisions; a fresh agent reads the code as a stranger would.

## What you're auditing for

Two locked design pillars (from `CLAUDE.md` and `wiki/Architecture/Frontend Architecture.md`):

1. **Snappy at every stage.** Bundle size, hydration cost, perceived latency, instant local meta hydration via bundled JSON, SWR caching, lazy-loaded tabs.
2. **Simplicity over cleverness.** Reach for the obvious option before the clever one. Three similar lines beats a premature abstraction.

Within those pillars, the user asked for:
- **(1) Pruning unnecessary complexity.** What did the prior session over-engineer? Where did it carry forward Astro idioms that don't fit Solid? What components have logic that could collapse?
- **(2) Opportunities to lean into Solid's strengths.** Where is the code "JS in JSX" rather than truly leveraging fine-grained reactivity, signals, stores, resources, and Solid's compilation model? Where would idiomatic Solid patterns make the code both shorter and more reactive?
- **(3) Take it to the next level.** Performance wins, DX wins, robustness wins — anything that pushes past "works" toward "feels like the platform was designed for this."

## Project state — the version of the world you're auditing

**Latest commits on `main`** (newest first):
```
e3fc16d fix(deploy): assets-first routing so root-level files serve correctly
d46c252 feat: pre-cutover polish — cache headers, social meta, legal pages
8fe8886 chore: image optimization + dark-mode pre-paint script
343a224 feat(deploy): cloudflare workers adapter — hand-rolled h3 shim
0960f13 feat: port albapepper/Scoracle@0cd4a10 — meta widget + pizza pass + compare redesign
4fd7fa1 feat: vite dev proxy + ErrorBoundary around profile cards
61bbc16 docs: end-of-day session retrospective for 2026-04-25
f7c5e3d chore(audit): end-of-Phase-3c audit — fully Solid-aligned
504d057 feat(phase-3c-c7): wire routes/profile.tsx — real flip-card composition
03f00d6 feat(phase-3c-c5): StatsCard + TraitsTab + CompareTab
07f57a1 feat(phase-3c-c4): PizzaChart + StatsTab — stats core
6124ce0 feat(phase-3c-c2): NewsCard + 4 tabs (News, X, CoMentions, Vibes)
ea854a3 feat(phase-3c-c1): foundation — TabContainer + content-tabs + EntityMeta
52ea0c9 chore(audit): clean stale Astro doc-string references
091998e feat(phase-3b): port Header + global app-level integration
26755ae feat(phase-3b): port home page — SearchBar + CrystalBall + assets
9a231b1 feat: add /terms (Terms of Service)
a33e891 feat(phase-3a): port shared plumbing — types, utils, stores, data
381e997 feat: phase 2 finish — middleware, route stubs, transition smoke
9838b89 chore: initial SolidStart 2.0-alpha scaffold
```

**What's live:** `https://scoracle-frontend.albapepper.workers.dev` with the same backend as production (`api.scoracle.com`, CORS already includes both the workers.dev URL and the eventual `scoracle.com` cutover destination).

**Bundle size today:** client JS total 142.5 KB (28% of the 511 KB budget). Worker upload 405 KiB / 93 KiB gzip.

## Read these resources before drawing conclusions

1. **`/home/sheneveld/scoracle-frontend/CLAUDE.md`** — project-level conventions and design principles. Authoritative for "what counts as good here."
2. **`/home/sheneveld/scoracleWiki/wiki/Architecture/Frontend Architecture.md`** — full design context, current state table, locked decisions, codified SSR patterns.
3. **`/home/sheneveld/scoracleWiki/wiki/Launch Plan.md`** — three-track launch plan (admin/revenue/eng). Calibrates "ready" vs "launched."
4. **`/home/sheneveld/scoracle-frontend/docs/progress/`** — every commit has a doc. The 2026-04-25 ones cover the build-up; 2026-04-26 ones cover deploy + polish. The session retrospectives at `2026-04-25_session-retrospective.md` and `2026-04-26_session-retrospective.md` are the daily summaries.
5. **`~/Scoracle/`** (Astro repo, read-only port-source) — useful only as a "what did the prior version do?" reference. Don't propose changes here.

## Suspicious areas — where the prior session has low confidence

These are the seven things the prior session flagged as worth scrutinizing. Treat them as starting points, not a closed list. **An audit that only covers these is incomplete.**

### 1. Event-bus pattern between EntityMeta and the profile route

`src/components/solid/EntityMeta.tsx` dispatches `window.dispatchEvent(new CustomEvent('profile:viewchange', { detail: { view } }))` when its toggle is clicked. `src/routes/profile.tsx` listens for `'profile:viewchange'` to drive its flip-card animation.

This was copied verbatim from the Astro repo where vanilla-JS DOM events were the cross-island bridge. In Solid, the idiomatic primitive is a nanostore (we already have `nanostores` + `@nanostores/solid` in deps and use them in `src/stores/`). Question: should this be a nanostore? What would the refactor look like? Are there other places (search → profile? compare → stats?) where the same pattern is silently in use?

### 2. Imperative `ResizeObserver` + ref management in `routes/profile.tsx`

The flip-card height management ports the Astro `<script>` pattern: `let observer = new ResizeObserver(...)`, `observer.disconnect()` during the flip transition, reconnect on `transitionend`, plus a 700 ms safety fallback. ~50 lines of imperative DOM manipulation inside `onMount`.

Question: can this be more declarative? Could a `createEffect` watching the active face's `scrollHeight` (via a ref-bound signal) replace the observer entirely? Is the disconnect-during-flip really necessary in Solid where the transition is CSS-only?

### 3. `clientOnly` wrappers on EntityMeta / NewsCard / StatsCard

All three are wrapped in `clientOnly()` from `@solidjs/start` because they read `window.location.search` at setup. This means the SSR shell renders empty containers and the cards hydrate on the client — costing TTFB for the visible-above-fold widget data.

Question: is this avoidable? `useSearchParams` from `@solidjs/router` is SSR-safe — what would it take to refactor the three components to use it instead, and what would we gain (full SSR of the profile shell)? The prior session codified this as an "SSR pattern" but admitted it was the path of least resistance, not the best path.

### 4. Directory naming — `src/components/solid/`

Vestigial from Astro, where `solid/` distinguished Solid components from `.astro` components in the same directory. In a pure Solid project this prefix is meaningless and adds an extra path segment to every import. Question: rename to `src/components/`? What's the import diff cost? Is there a migration script to update every import in one pass?

### 5. Mixed fetch patterns across components

Some tabs use `createResource(...)` directly. Some use manual `swrFetch` + signals + `createEffect`. Some have helper functions in `src/lib/utils/`. There's no canonical pattern documented.

Question: which is right for which case? Should there be a single `useEntityFetch(entity)` primitive that wraps `swrFetch` + `createResource` + cache hydration? Where would consolidation reduce code and where would it force a Procrustean fit?

### 6. Zero test coverage

There are no tests. Not in `src/`, not in a `tests/` dir, not anywhere. The prior session shipped under a "verify by curl + browser smoke" model.

Question: should there be tests? If yes, which slice is highest-leverage — the data utilities (`stats-categorizer`, `position-groups`, `player-metrics`, `entity-data-store`)? The component render paths? Shouldn't introduce a testing harness for the sake of it; what would a minimum-viable test surface look like that catches real regressions?

### 7. `@jsxImportSource solid-js` directive cleanup audit

The prior session removed `/** @jsxImportSource solid-js */` directives during the Phase 3b/3c port (they conflicted with vite-plugin-solid in 2.0-alpha). The cleanup was claimed as "complete" but never re-verified globally.

Question: `grep -rn 'jsxImportSource' src/` — are any left? Should there be one anywhere?

## Intentional design choices — DO NOT "fix" these

The audit will produce its best findings when it knows what's deliberate. **These are locked:**

- **Single profile page.** All entity views (player + team) behind one `/profile` route with URL params. No `/players/[id]`, no `/teams/[id]`. Per design pillar #1.
- **Islands own their data.** Each component fetches its own data via reactive resources. Don't propose a centralized data layer.
- **Lazy-load everything else.** Tabs activate-load via `isActive` render prop in `TabContainer`. Heavy modules import on demand. Don't propose eager-loading "for simplicity."
- **Native CSS + custom properties.** No Tailwind, no CSS-in-JS, no styled-components. Don't propose any. Tokens come from `@scoracle/tokens` only.
- **Bundle JSON for autocomplete.** `public/data/{sport}.json` and `{sport}-meta.json` are bundled at build time, refreshed via `npm run fetch-data`. Provides instant autocomplete + meta hydration with zero API roundtrip. Don't propose moving to runtime fetch.
- **`@scoracle/ui` does not exist.** Components live inline here until a 2nd product needs them. Don't preemptively factor.
- **Don't modify `~/Scoracle`.** Port-source only. Don't propose backporting findings to the Astro repo.
- **`worker.ts` is intentionally minimal.** It's a hand-rolled shim because SolidStart 2.0-alpha ships no CF adapter. Will be swapped when the Nitro v3 integration lands. Don't elaborate it.
- **CORS / dev proxy in `vite.config.ts` is intentional.** Frontend dev server proxies `/api/*` → `localhost:8000`; production reads `PUBLIC_GO_API_URL` from `wrangler.jsonc` vars. This is the right shape; don't propose unification.
- **`/terms` and `/privacy` are DRAFT-marked scaffolds.** Final content comes from a generator (Termly etc.) per Launch Plan Track A. Don't propose authoring real legal text.
- **`solid-transition-group` is dep-allowed but only for in-component animation** (e.g., the carousel). Don't propose page-level transitions.
- **Per-route rendering mode is a thing** but currently every route is SSR. The Frontend Architecture doc has a target split (static prerender for `/`, `/profile`, `/terms`, `/404`); SolidStart 2.0-alpha lacks the prerender story without Nitro, so this is deferred. Don't propose changes that depend on prerender.

## What the audit output should look like

Produce a single markdown doc at `/home/sheneveld/scoracle-frontend/docs/audits/2026-04-26_pre-cutover-audit-findings.md` (create the dir; mirror to `~/scoracleWiki/Progress/scoracle-frontend/2026-04-26_pre-cutover-audit-findings.md`).

Structure:

```markdown
# Pre-cutover audit findings

## Summary
[3-5 sentences: overall health, top 3 risks, recommended order of operations]

## Findings
[Each finding gets a section]

### [N]. [Short imperative title — what to do]
**Severity:** [Critical / High / Medium / Low / Note]
**Effort:** [S / M / L]
**Aligns with:** [Snappy / Simple / Both / Neither (justify)]

[1-3 paragraphs:
 - what's wrong / what could be better
 - file:line references for everything
 - concrete proposed change (don't write code, sketch it)
 - what we lose by NOT doing this
 - any risk / counter-argument worth noting]
```

**Severity rubric:**
- **Critical**: blocks the cutover OR is a real bug masked by the test surface
- **High**: visible degradation against the design pillars; should fix before cutover or commit to fixing in week 1
- **Medium**: real improvement, no rush; queue for the week after cutover
- **Low**: hygiene, do when convenient
- **Note**: things you noticed but don't need fixing — explicit "this is fine" signals are valuable to the next reviewer

**Effort rubric:**
- **S**: < 1 hour, single file, no public-API change
- **M**: 1-4 hours, multiple files, may need `npm run typecheck` rounds
- **L**: half-day+, multi-component refactor, needs a plan before code

## Constraints

- **The deploy is live.** Don't break the workers.dev URL. Any change you propose must keep `npm run cf:deploy` green.
- **Don't change behavior unless the audit finding explicitly says to.** Refactors must be observably equivalent.
- **Don't write code in the audit doc.** The audit produces findings; a separate session implements them.
- **Don't grow the dependency footprint** without naming what we'd lose by not adding it. Solid's whole pitch is small + fast.
- **Don't refactor for refactor's sake.** Per `CLAUDE.md`: "Three similar lines is better than a premature abstraction." If you propose an abstraction, justify it against this rule.
- **Don't propose Tailwind, CSS-in-JS, a state manager beyond nanostores, a data-fetching library beyond what's there, or a testing framework you haven't first justified the need for.** Treat the existing tech as load-bearing until proven otherwise.

## How to start

```bash
# Multi-dir session, same as the build sessions:
cd ~/scoracle-frontend
claude --add-dir ~/scoracleWiki --add-dir ~/Scoracle
```

First prompt to the fresh session: paste this entire document. It should respond by reading `CLAUDE.md`, the Frontend Architecture wiki, and the most recent progress docs in that order, then producing the audit findings doc. No code changes — pure analysis.

When the audit is done, the next session (third one — fresh again) implements the highest-severity findings.

## What "done" looks like for the cutover

After the audit + any cutover-blocking fixes, the user flips the CF Workers route on `scoracle.com` from the legacy Astro Worker to `scoracle-frontend`. Old Astro stays as 72 h hot standby per the Launch Plan. That's Phase 4 of the unified roadmap. Phase 3 (Capacitor wrapper) starts after cutover.
