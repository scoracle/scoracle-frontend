# 2026-06-07 — Compare (butterfly) + leaderboard Search + OG rate/scope parity

## Goal
Wire the three deferred ScopeStrip follow-ons: a **Compare** control with the
side-by-side butterfly render, a **Search** control on the leaderboard, and **OG
share cards that honor `?rate=`/`?scope=`** (+ a compare OG) so shares match the app.

## What Was Done
- **Compare (full):**
  - `?vs=` state on ProfileContext (`vs`/`setVs`, URL-synced), mirroring scope/rate.
  - `CompareControl` — a `<Disclosure>` reusing the existing `CompareSearch`
    autocomplete; picking an entity sets `?vs=`. Resolves the vs id → entity (via
    bundled data) for the "vs <name> ×" pill. ScopeStrip control `compare`
    (players, composite tab).
  - `CompositeCard` renders the **prebuilt `ButterflyChart`** in compare mode:
    primary on the left semicircle, vs on the right, both run through the SAME
    `ratingForMode` + scope; merged breakdowns → mirrored pairs. Dual scoped
    headline (A vs B). Single mode unchanged.
- **Search (leaderboard):** `SearchControl` — a `<Disclosure>` + bundled
  autocomplete (entityDataStore) that jumps to any entity's profile (not just the
  loaded top-N). Replaces the bare board-filter input.
- **OG parity + compare:**
  - OG route reads `?rate`/`?scope`/`?vs` → `OgBodyCtx`.
  - `compositeBody`/`specialistBody` apply `ratingForMode` + scoped composite (+
    cohort line). New `compareBody` + `bodies/compare.ts` `compareBodySvg` — the
    butterfly's SVG twin (same `arc-math`, no drift), registered as OG `compare`.
  - Profile `og:image` carries `rate`/`scope`/`vs` (and switches to the `compare`
    card when comparing); `buildShareUrl`/`buildShareText`/`ShareTrigger`/`Card`
    carry the same `extra` state so a shared card matches the on-screen view.

## Files Changed
New: `CompareControl.{tsx,css}`, `SearchControl.{tsx,css}`, `lib/cards/bodies/compare.ts`.
Modified: `CompositeCard.tsx`, `ContentShell.tsx`, `card-registry.tsx`,
`contexts/profile.ts`, `routes/profile.tsx`, `routes/leaderboard.tsx`,
`routes/og/[cardType]/[sport]/[type]/[id].ts`, `lib/cards/og-bodies.ts`,
`lib/share/{ShareTrigger.tsx,text.ts}`, `lib/utils/share-url.ts`, `Card.tsx`,
`StatsCard.css`.

## Verification
- `npm run typecheck` clean; `npm test` → 111 tests pass.
- Live (dev vs prod API): in-app compare = Jokić 99.6 **vs** Luka 99.2 with the
  butterfly (9 mirrored pairs); leaderboard Search "joki" → Nikola Jokić;
  Per-X/Scope/Compare all in the strip. (Screenshots captured.)
- OG: the route + body SVG generation run (reach the rasterizer) under `?rate`/
  `?scope`/`?vs`; the **PNG can't render in Vite dev** (resvg `.wasm` isn't served
  there — the pre-existing dev limitation; the plain `/og/composite` 500s the same
  way). Renders in production via the Cloudflare ASSETS binding — verify post-deploy.

## Result
ScopeStrip is feature-complete: Season / Scope / Per-X / Search / Compare. Compare
reuses the butterfly; shares (incl. compare + per-X + scope) carry their state into
the OG card. #23 and its follow-ons are done.
