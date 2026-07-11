# Refactor Plan: Card Token + Full Solid Alignment

**Status: ready to execute. Delete this file in the final phase.**

Authored 2026-07-10 with Scott, immediately after the de-slop refactor landed
(commit `abf422e`: one rendering contract, crawler apparatus deleted, homepage
content strips, entityDataStore retired, rate-limit fix). Read
`docs/ARCHITECTURE.md` first — it describes the current state and the rules
this plan must preserve.

## Product philosophy (Scott, verbatim intent)

- `/leaderboard` surfaces hierarchy; `/profile` reveals the cards — the actual
  products. Design pillars: **lean, nimble, durable**.
- Share/OG history: the old goal was share-with-link and per-entity OG images.
  That led to rabbit holes and half-solutions (a 1,800-line server rendering
  pipeline whose only live consumer is `og:image` tags, plus a share layer
  that has been `shareable: false` since June).
- **New vision: the card is the value, no strings attached.** A copy icon on
  each `/profile` card renders that card to an image on the client and puts it
  on the clipboard. Users paste it anywhere (group chats, X, wherever). No
  links, no share sheets, no server rendering.

Decisions already made with Scott — do not re-litigate:

1. **Identity band on the card itself** (not composed at copy time). Every
   profile card permanently carries a slim entity eyebrow at the top (e.g.
   "LEBRON JAMES · LAL · NBA · 2026"). What you see is what you copy.
2. **Unfurls: one static brand image.** All `og:image`/`twitter:image` tags
   point at a single static asset; per-entity unfurl images are gone.
3. **Content-fit pass targets News, Rating, Sigil.** All profile cards render
   vertically (portrait card silhouette — tokens exist in `global.css`:
   `--card-width-portrait`, `--card-aspect-portrait`). Only `/leaderboard`
   keeps expanded/ledger cards.

## Execution rules

- One phase per commit, in order. After every phase:
  `npm run typecheck && npm test && npm run cf:build && npm run verify:ssr`.
- Keep `scripts/verify-ssr.mjs` markers in sync when card markup changes.
  **Never** import the built server entry with a query string in that harness
  (silently kills SSR data fetching — see ARCHITECTURE.md).
- The rendering contract is inviolable: same HTML for every UA, all content
  through server `query()` + `createAsync`.
- Deploy at the very end (`npm run cf:deploy`), then spot-check production as
  `Mediapartners-Google` (home, leaderboard, one profile) and click-test the
  copy feature in a real browser.

---

## Phase 1 — SolidStart upgrade spike (timeboxed ~2h)

**Goal:** get off `@solidjs/start@2.0.0-alpha.2` if a newer release lets us
delete workarounds. Do this first because Phases 2–3 build on router/SSR
behavior.

- `npm view @solidjs/start versions` — try the newest 2.x alpha/beta with
  matching `solid-js`/`@solidjs/router`.
- Success criteria: `cf:build` + `verify:ssr` green, dev server works, direct
  profile load hydrates (the historical failure mode: blank profile on
  shared-link load).
- On success, attempt to retire (each individually, verify after each):
  `scripts/patch-solidstart-error-boundary.mjs` (and `build`/`cf:build`
  script prefixes), `scripts/clean-wrangler-ssr-imports.mjs`, the `h3`/`srvx`
  `overrides` in package.json, and — if a Cloudflare preset now exists — the
  hand-rolled `worker.ts` adapter.
- On failure: revert, note the blocking issue at the top of this file, and
  continue. **Nothing downstream depends on this succeeding.**

## Phase 2 — One router: URL state unification

**Goal:** delete the parallel routing-state system; `@solidjs/router` becomes
the only owner of location state.

Current scar tissue: `src/lib/utils/url-search-params.ts` (Proxy over a
signal reading `window.location`) + `src/components/solid/AppRail.tsx`
monkey-patching `history.pushState`/`replaceState` and broadcasting
`SCORACLE_LOCATION_CHANGE_EVENT` (~14 references).

1. Spike first: confirm the router's `useSearchParams` is reliably reactive
   in this version (git-blame `url-search-params.ts` to learn why it was
   avoided; suspected alpha-era hydration desync).
2. Migrate consumers: `routes/profile.tsx`, `routes/leaderboard.tsx`,
   `ContentShell.tsx` → `useSearchParams`; `AppRail.tsx` → `useLocation` +
   `useSearchParams` (it renders inside the Router root, so this is safe).
3. **Profile tabs onto the URL**: tab clicks write `?tab=` with
   `{ replace: true }`. This collapses the `activeTab` signal +
   `epoch`/`landingTab` dance in ContentShell (it exists only because tabs
   don't write the URL today) and matches the leaderboard's all-state-on-URL
   pattern. Keep `deriveInitialTab` for defaulting/validation.
4. Delete `url-search-params.ts`, the monkey-patching, and the custom event.
5. Manual test: direct/shared-link profile load, back/forward through tabs,
   entity switch via search while on a non-default tab.

## Phase 3 — The card token: identity band + vertical silhouette + fit

**Goal:** every profile card is a self-contained, portrait, brand-true
artifact.

1. **Identity band** in `src/components/solid/Card.tsx` (the product-card
   wrapper — every card body already renders through it). It already resolves
   `getEntityMeta` via `createAsync` (used for share copy today); reuse that
   for a slim eyebrow: entity name · team code · sport · season when the card
   is season-scoped (read `ProfileContext`). Must render through SSR (it
   will — the query resolves server-side). Style with existing tokens
   (`card-eyebrow`/`card-micro-eyebrow` vocabulary in `content-cards.css`).
   Consider a small Scoracle wordmark in the card chrome so the artifact
   self-attributes when pasted — design call, keep it quiet (Shell corner
   territory).
2. **Vertical silhouette**: profile cards lock to the portrait card tokens.
   Leaderboard's ledger/expanded Shell is explicitly exempt.
3. **Fit pass** (in scope: News, Rating, Sigil): each must fully fit the
   portrait card — the copy artifact must never crop.
   - News: cap visible narratives/transfer rows to what fits (product call:
     top-N by impact; no scrolling inside a card).
   - Rating, Sigil: verify, trim if needed (Rating already caps to top-3
     strengths + bottom-3 weaknesses).
   - Stats and Momentum: out of scope this pass unless trivially broken.
4. **Meta-card-first reveal (Scott, 2026-07-10):** on client-side navigation
   the card panes currently mount before EntityMeta resolves, then get shoved
   down when the (taller-than-its-skeleton) meta card lands. Fix by
   coordinating the REVEAL, not the fetches — do NOT serialize or gate data
   loading (that's the pattern the de-slop refactor deleted):
   - Wrap `<EntityMeta />` + `<ContentShell />` in one shared `<Suspense>` in
     `routes/profile.tsx`; let EntityMeta's `resolveEntityMeta` read suspend
     to that boundary (remove/loosen its internal Suspense). The pane-level
     Suspense boundaries inside ContentShell still catch the card product
     reads, so the shared boundary's only long-pole is entity meta (bundled
     JSON — fast). Result: meta content and pane skeletons paint together,
     in final position; every product query still fires in parallel.
   - Size the shared fallback skeleton close to the resolved meta card's
     height so the boundary swap itself doesn't shift.
   - Affects client-side nav only (SSR documents arrive complete); test via
     search → profile and entity-switch flows, not just direct loads.
5. Update `verify-ssr.mjs` markers if band text is a better content marker
   (e.g. assert the band renders in profile SSR).

## Phase 4 — Copy-the-card feature

**Goal:** a copy icon on every profile card puts a crisp PNG of that card on
the clipboard.

1. **Capture spike** (pick one): `modern-screenshot` or `html-to-image`.
   Criteria: correct webfont embedding (Fraunces/DM Sans are self-hosted,
   same-origin — should inline cleanly), correct rendering of inline SVG
   (pizza charts, sparklines, vibe art), output at `pixelRatio: 2`.
2. **`CopyCardButton`** replacing ShareTrigger's slot in `Card.tsx`
   (top-right against the Shell root). Behavior:
   - `navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])`.
     Safari quirk: construct the `ClipboardItem` with a `Promise<Blob>`
     synchronously inside the click handler, THEN capture — Safari revokes
     clipboard permission if the gesture context is lost to an await.
   - Fallback when image clipboard is unsupported: download the PNG
     (`<a download>`), same artifact, no dead button.
   - Feedback: brief check-mark state on the button (no toast system needed).
3. **Third-party image risk (the one real unknown):** TransferRow avatars in
   the News card come from provider CDNs; capture libs must fetch them, and
   missing CORS headers will fail or blank them. Test early. Mitigations in
   order of preference: (a) accept the lib's placeholder for tainted images,
   (b) render the existing monogram fallback in the capture, (c) only if the
   product demands real faces: a tiny allowlisted image proxy route in the
   Worker. Do NOT build (c) speculatively.
4. Buttons are per-card and always visible (this replaces `shareable`
   gating — the feature is never "paused," it's just there).

## Phase 5 — OG/share teardown (the big deletion)

**Goal:** delete the entire server-side image pipeline and the dormant share
layer. ~1,800 lines + assets + 3 dependencies.

Delete:
- `src/lib/og/` (all 9 files), `src/routes/og/[cardType]/[sport]/[type]/[id].ts`
- `src/lib/cards/og-bodies.ts`, `src/lib/cards/bodies/` (all 9)
- `src/lib/share/` (ShareTrigger + css, dispatch, text.ts + test)
- `src/lib/utils/share-url.ts` + test, `src/components/solid/ShareFallbackModal.tsx` + css
- `routes/leaderboard.tsx`: the share button, `shareBoard()`, `shareFallback`
  signal, `ogImageUrl()`
- `src/lib/cards/card-meta.ts`: `shareable`/`shareCategory` fields (KEEP
  `archetype`, `pillarLabel`, `transferNoun`, `fantasySupported` — live)
- `scripts/copy-og-wasm.mjs` + the `postinstall` script entry
- `worker.ts`: the wasm import + `setResvgModule` (slims to the h3 serve
  adapter only — unless Phase 1 already deleted worker.ts entirely)
- `src/lib/utils/cloudflare-env.ts`: `makeAssetFetch`/`assetFetchForEvent`/
  `AssetFetch` (OG-only; KEEP `readServerAssetText` + `getCloudflareEnv` —
  entity-directory and fetch-json depend on them)
- `public/og/` (fonts, frames, wasm)
- Dependencies: `@resvg/resvg-wasm`, `@fontsource/pt-serif`, `sharp`
  (orphan devDep, nothing references it)

Replace:
- Add one static brand image to `public/` (e.g. the crystal ball on the tarot
  frame; Scott may supply — otherwise compose from existing
  `public/images/scoracle_crystal_ball.png` + chrome assets, 1200×630).
- Repoint all 5 `og:image`/`twitter:image` sites (`routes/profile.tsx`,
  `routes/leaderboard.tsx`, defaults in `app.tsx`) at it; delete the
  `ogImageUrl()` builders. Per-entity `<title>`/description text stays.
- `lib/vibe/` stays (SigilCard + leaderboard empty faces use it). All
  share/OG comments referencing "the crawler fetches og:image" should be
  updated or removed as encountered.

## Phase 6 — Grab-bag, docs, ship

1. `solid-transition-group` → CSS transition (single consumer:
   `CrystalBall.tsx`); drop the dependency.
2. The six one-line `*CardSkeleton` exports → a registry-level default
   (`fallback` optional in `CardDef`, default `<LoadingCard label={label} />`).
3. `__DATA_VERSION__` in `vite.config.ts`: `Date.now()` → content hash of
   `public/data/*.json`, so unchanged data survives deploys in caches.
4. Rewrite the OG/share sections of `docs/ARCHITECTURE.md` (new "Card copy"
   section; delete the OG subsystem section; update the deploy section if
   Phase 1 removed workarounds). Update README's Commands/Architecture bits
   if they drifted.
5. Full verification, `npm run cf:deploy`, production spot-check (crawler UA
   + real-browser copy-paste test), **delete this file**, commit.

## Out of scope (explicitly)

- Backend changes (none needed). Historical Railway mentions in
  scoracle-backend's planning/progress docs — Scott hasn't asked; leave.
- Stats/Momentum card redesigns beyond trivial fixes.
- Any crawler-conditional anything. Ever.
