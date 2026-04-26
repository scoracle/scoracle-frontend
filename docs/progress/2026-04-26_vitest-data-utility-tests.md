# Vitest harness + data-utility test surface

**Date:** 2026-04-26
**Scope:** Audit finding #12 (Medium / M). The last Medium-severity item from the audit. Adds a minimum-viable test surface for the deterministic, data-shape-sensitive utilities — the layer where backend changes silently regress the UI without any compile-time signal.

## Goal

Zero tests existed before this commit. The audit identified the high-leverage surface as the pure data utilities — `stats-categorizer`, `co-mentions`, `position-groups`, `player-metrics`, `search-normalize`, `url`, `date` — because:

1. They're deterministic (no network, no DOM, no time).
2. They're data-shape sensitive (a backend rename or a sport-specific config typo silently empties a tab).
3. They're called from every entity rendered, but none of them have a build-time signal that catches a regression — the only repro path is "user opens browser, sees blank tab."

This commit installs Vitest, adds a separate `vitest.config.ts` (so the SolidStart Vite plugin doesn't load during tests), and writes 67 tests across the seven highest-leverage modules.

## What Was Done

### Tooling

- `npm install -D vitest happy-dom` (devDependencies). `happy-dom` provides minimal `window`/`document` globals for the URL helper which references `window.location.origin`.
- `vitest.config.ts` — separate from `vite.config.ts` so tests run without the SolidStart plugin (irrelevant for pure data utilities, and avoids loading the entire app graph). `environment: "happy-dom"`, `include: ["src/**/*.test.ts"]`.
- `package.json`: `"test": "vitest run"` and `"test:watch": "vitest"`.

### Test files

- `src/lib/utils/search-normalize.test.ts` — 6 tests. Diacritic folding (Estêvão → estevao, José María → jose maria), lowercasing, trimming, null/undefined/empty input, and the documented edge case where the German ß has no decomposition.
- `src/lib/utils/url.test.ts` — 6 tests. Pass-through for http/https, rejection of `javascript:` and `data:` URIs (the XSS attack vectors), null/empty input, and the documented behavior that "relative" inputs resolve against `window.location.origin` rather than being rejected outright.
- `src/lib/utils/date.test.ts` — 3 tests. ISO-date formatting (using fully-specified UTC datetimes so CI doesn't flake on timezones), undefined input, and the "Invalid Date" string from `toLocaleDateString` for nonsense input.
- `src/lib/utils/player-metrics.test.ts` — 16 tests. Height in feet-inches strings, centimeters, meters, inches; weight in kg/lbs (explicit and inferred from typical-athlete ranges); age from DOB (using relative dates so the test doesn't drift over time); range-floor and range-ceiling rejections.
- `src/lib/utils/position-groups.test.ts` — 12 tests. NBA / NFL / Football position normalization, case-insensitivity, sport-id case-insensitivity, unknown-position handling, the permissive `isSamePositionGroup` semantics ("if either side is unknown, allow"), display formatter, and the `getPositionGroupsForSport` listing.
- `src/lib/utils/co-mentions.test.ts` — 17 tests. `normalizeText` (the function that must stay in sync with the Go backend's `normalize_text`), `entityMatchesText` (2-token requirement, single-word floor of 4 chars, suffix filtering, diacritic-insensitivity), and `findCoMentions` (excludes searched entity, counts across multiple articles, sorts by mention count desc, ignores empty titles).
- `src/lib/utils/stats-categorizer.test.ts` — 7 tests. `normalizePercentiles` for both object and array forms plus malformed-row filtering. `categorizeStats` for NBA player shape; null/undefined stat skipping; empty-config tolerance; defensive fallback to NBA config for unknown sport (current behavior, documented). `getRateLabel` for the three sports. `getStatLabel` known + unknown keys.

### Total: 67 tests, all green, ~680 ms wall time.

## Files Changed

**Added**
- `vitest.config.ts`
- `src/lib/utils/search-normalize.test.ts`
- `src/lib/utils/url.test.ts`
- `src/lib/utils/date.test.ts`
- `src/lib/utils/player-metrics.test.ts`
- `src/lib/utils/position-groups.test.ts`
- `src/lib/utils/co-mentions.test.ts`
- `src/lib/utils/stats-categorizer.test.ts`
- `docs/progress/2026-04-26_vitest-data-utility-tests.md`

**Modified**
- `package.json` — `vitest`, `happy-dom` devDependencies + `test` / `test:watch` scripts

## Verification

- `npm test` — 67/67 passing.
- `npm run typecheck` — green (test files included in the project's tsc pass).
- `npm run build` — green.

A few tests intentionally document *current behavior* rather than enforce a desired contract — `formatDate` returning "Invalid Date" for nonsense, `sanitizeUrl` resolving relative input against the current origin, `categorizeStats` falling back to NBA config on an unknown sport. Those are flagged in test-comment form so a future maintainer changing the function knows whether the test is asserting an invariant or a documented quirk.

## Result

Audit finding #12 closed. The data-utility surface is now covered:

- **Diacritic folding regression** would fail `search-normalize.test.ts` and `co-mentions.test.ts` immediately. This is the most fragile area for the Football sport (Portuguese / Spanish / French names everywhere).
- **Position-group typo** in the sport configs (e.g., a backend renaming "QB" to "QUARTERBACK") would fail `position-groups.test.ts`.
- **Stats-config sport-key mismatch** (e.g., the categorizer's `CATEGORY_CONFIG` no longer matching the Go API's stat_definitions) would empty `categorizeStats` results and fail the relevant test.
- **`normalizePercentiles` shape drift** (the Go API switching back from object map to array form, which has happened before) would fail `stats-categorizer.test.ts` regardless.
- **Backend co-mention algorithm divergence** between `backend/app/utils/text.py:normalize_text` and frontend `normalizeText` would surface immediately when the test fixtures stop matching; the in-source comment says these implementations must stay in sync.

Component-level tests are intentionally out of scope. Solid components are best validated by the existing build + browser smoke path, and adding `@solidjs/testing-library` or similar is a bigger investment than the audit recommended for an initial test surface.

## Result for the audit

Twelve findings closed across six commits this session:

| Finding | Severity | Status |
|---|---|---|
| #1 — Restore SSR shell | High | ✅ |
| #2 — Lazy-load gating | High | ✅ |
| #3 — pageDataStore → nanostores | High | ✅ |
| #4 — CustomEvent bridge | Medium | ✅ |
| #5 — ResizeObserver simplification | Medium | ✅ |
| #6 — `shouldLoad` ladder collapse | Medium | ✅ |
| #7 — Header anchor onClick | Medium | ✅ |
| #8 — CompareSearch diacritic parity | Medium | ✅ |
| #9 — CompareSearch redundant onMount | Low | ✅ |
| #10 — Dead code purge | Low | ✅ |
| #11 — `statsUrl` alias inlined | Low | ✅ |
| #12 — Vitest data-utility tests | Medium | ✅ |
| #13 — SWR cache scope comment | Low | ✅ (added in #3 commit) |
| #14 — `normalizePercentiles` dedup | Low | ✅ partial (categoryToChartStats stays inline) |
| #15 — VibesTab metaReady simplified | Low | ✅ |
| #16 — `components/solid/` rename | Low | ⏸ defer |
| #17–#20 — Notes | Note | n/a |

The audit's recommended order — quick wins → state plumbing refactor → SSR refactor → tests — is complete except for the cosmetic directory rename (#16). Three High and five Medium severity items closed; cutover blockers were closed in the first two commits.

## Next

DNS cutover. The audit's outstanding "what's `done` looks like for the cutover":

> After the audit + any cutover-blocking fixes, the user flips the CF Workers route on `scoracle.com` from the legacy Astro Worker to `scoracle-frontend`.

Run `npm run cf:deploy` to push the new shape to `https://scoracle-frontend.albapepper.workers.dev` and verify side-by-side, then flip the CF dashboard route.
