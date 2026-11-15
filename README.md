# scoracle-frontend

Flagship client-facing web app for `scoracle.com`: Astro 7.4.12, Solid 1.9.19,
TypeScript, and Cloudflare Workers. One root package owns the application.

The Astro migration is deployed to production. Verification and explicitly accepted
release exceptions are recorded in the [canonical plan](../scoracle-wiki/progress_docs/scoracle-frontend/2026-11-07_astro-migration-plan.md).
See [architecture](docs/ARCHITECTURE.md) and [runtime contracts](docs/astro-runtime.md).

## Start Here

Before working in this repo, read these in order:

1. This README
2. [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md)
3. [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md)

The wiki owns product direction. The tokens repo owns the shared visual doctrine. This repo owns the web implementation.

Every session in this client-facing repo must be aware of `../scoracle-wiki`.
The wiki is the product authority for narrative, shared vocabulary, changelog
landmarks, and cross-repo context; do not treat it as optional background.

## Architecture Philosophy

Astro owns documents, metadata, routing and server endpoints. Home and About
prerender; profile identity and leaderboard shells render on demand. Browser and
crawler requests receive the same HTML. Live products load independently after
hydration, so JavaScript is required for readings and rankings; identity and
metadata remain useful during a product outage.

Astro owns page furniture; one coherent Solid island owns each Card/deck or
Board experience, including its reactive rail and conditions. Profile details and
Home artwork are static Astro slots. Home retains one bounded discovery island
for search and movers, alongside the shared native Astro AppTray. About ships no Solid runtime. Ordinary links navigate documents. Products have explicit local owners,
retry, cancellation and deadlines; there is no application router, RPC compiler,
shared query cache or full-product SSR path.

## Shared Organization Docs

Shared process, vocabulary, and history live in `scoracle-wiki`, not this repo:

- [../scoracle-wiki/wiki/CONVENTIONS.md](../scoracle-wiki/wiki/CONVENTIONS.md) - how shared docs, progress, glossary entries, and changelog entries are organized.
- [../scoracle-wiki/wiki/Glossary.md](../scoracle-wiki/wiki/Glossary.md) - cross-repo product and architecture vocabulary.
- [../scoracle-wiki/wiki/Changelog.md](../scoracle-wiki/wiki/Changelog.md) - landmark architecture and product shifts.

Use those docs when adding shared language, recording landmarks, or checking historical context. Keep web-only implementation detail in this README or [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Planning and progress docs never live in this repo** (convention set
2026-07-11): every plan and work log goes in
`../scoracle-wiki/progress_docs/` as `YYYY-MM-DD_short-description.md` —
post a plan there when authored, mark it executed when it lands. This repo
holds only durable docs: this README and `docs/`.

## Pillars

Scoracle is lean, nimble, and durable.

Elegance comes through simplicity. Simple and durable beats clever and fragile. The flow of information must be clear and clean.

Our role is to eliminate noise around entities and divine the facts. Frontend code should preserve that clarity: consume clean products, avoid hidden derivation, and serve the model's value through an elegant UI.

## Repo Role

- Type: `frontend/client-facing`
- Owns: the production web experience, Astro documents, Solid islands, card composition, web routing, web data fetchers, the copy-the-card artifact, and Cloudflare Worker deployment.
- Does not own: product doctrine, visual doctrine, backend derivation, API truth, or token definitions.
- Primary consumers: Scoracle users on `scoracle.com`.

## Session Workflow

1. Read this README.
2. Sync safely:

```bash
git fetch
git status --short --branch
```

Pull only when the working tree is clean and the branch has not diverged.

3. Read [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md).
4. Read [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md).
5. Perform the task in the smallest useful chunk.
6. If the change is a product, data-contract, aesthetic, or architecture landmark, add a progress doc in `../scoracle-wiki/progress_docs/` (all planning/progress docs live there, never here) and update `../scoracle-wiki/wiki/Glossary.md` or `../scoracle-wiki/wiki/Changelog.md` as needed.
7. Run `npm run typecheck`, `npm test`, and `npm run cf:build`. Start production preview for `npm run verify:ssr` and `npm run test:browser`; stop it afterward.
8. Commit. Push only under the applicable session authorization.
9. For unfinished multi-step work, leave a copyable handoff.

## Working Context

Keep context narrow. Most web tasks need only:

```text
scoracle-frontend/
../scoracle-wiki/
../scoracle-tokens/
```

Add `../scoracle-backend/` only for endpoint contract or payload-shape work. Do not load the full org by default.

## Setup

Requires Node **22.23.4+** and the sibling `scoracle-tokens` checkout with its
built package. Registry read credentials remain unavailable, so the manifest
explicitly uses that sibling source.

```bash
npm ci
npm run dev          # Astro development, loopback only
npm run dev:stop     # Astro backgrounds its server; explicitly stop it
npm run typecheck   # Astro + TypeScript checks
npm test            # Presentation/pure tests plus product/transport tests
npm run cf:build     # Delivery artwork + Astro build + bundle assertions
npm run preview     # Production workerd preview (port 4322)
npm run verify:ssr  # Shell/status/redirect/metadata/API checks against preview
npx playwright install chromium firefox webkit # Once per browser version
npm run test:browser # Browser products and interactions against preview
npm run preview:stop
npm run cf:types     # Regenerate Worker bindings
npm run cf:deploy:dry # Build and validate deployment bundle without deploying
npm run fetch-data  # Refresh bundled entities and sitemap
```

`SCORACLE_TEST_ORIGIN` changes the browser suite's target. Pass an origin directly
to `node tests/runtime/preview.mjs` for the HTTP checks. Chrome DevTools assertion
functions live in `tests/runtime/{profile,board}-browser.js`; the board probe
unmounts its island, so reload afterward. No API tunnel or fault proxy is required.
Local secrets belong in ignored `.dev.vars`. Never commit credentials.

## Architecture

`src/layouts/SiteLayout.astro` owns the shared shell. `src/pages/` owns routes
and validated same-origin `/api/*` endpoints; `src/islands/` owns the interactive
experiences. Synchronous initial renders hydrate before browser product reads.

Surface ownership is a product pillar:

- `/leaderboard` exposes hierarchy and ranked discovery: sport -> league/conference -> division -> team -> player.
- `/profile/{sport}/{type}/{id}-{slug}` surfaces cards for one selected
  entity (path-based since 2026-07-18; the old `/profile?sport=…&id=…` shape
  301s to it, and bare `/profile` redirects to `/leaderboard`). Build every
  profile link through `lib/utils/profile-url.ts`.
- Roster discovery is a team-scoped player leaderboard, not a profile card.

Profile pages are card-first, in this order:

```text
Profile -> Scouting -> Narratives -> Transfers -> Vibe -> Momentum -> Sigil
```

The deck is dealt, not fixed: `lib/cards/deck-presence.ts` asks each character whether it has anything to say about this entity, and only those cards get a pane and a tab. An entity with three readable cards gets a three-card deck and a three-tab rail; an entity with none gets no rail at all and its meta card sits alone. The order above is the order the dealt cards keep.

Cards become available as their own product reads settle; a slow sibling does not
delay readable cards. A requested pending card keeps its loading seat. Only the
score ring waits for all eight primary reads, then appears atomically. The initial
Astro HTML includes an inline deck-back graphic, and empty profiles retain its
hidden layout footprint.

Roster discovery lives on `/leaderboard` as a team-scoped player board. Profile-local product owners supply cards, scores, membership and conditions without duplicate reads. Navigation changes visibility; it should not gate fetching or create passthrough data dependencies.

Key primitives:

- `Card` is the profile's artifact: the vessel (stock, weathered frame, wash, name box, paper shadow) and the leaf content unit. It surfaces the voice of one character.
- `Board` is the leaderboard's artifact: the sheet (stock, masthead, Scotch rule, rank spine, register, foot). It reveals hierarchy. The Card is drawn; the Board is printed.
- `NavWell` owns selection: the tab row with the Marker, plus the conditions line of scoped controls beneath it. One object in the tray well, used by both the profile and the leaderboard.
- `ReadingTable` composes profile navigation and card panes.
- `CARD_REGISTRY` is the source of truth for which profile cards exist and in what order; `deck-presence.ts` is the source of truth for which of them a given entity holds, and `deck-scores.ts` for the number each one shows.

Both artifacts use the shared light/night deck palettes from `@scoracle/tokens`.

Detailed repo-local architecture rules live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Data Boundary

The frontend consumes precomputed products from the backend. It should not call third-party data providers, scrape feeds, invoke models, or reconstruct Scoracle products from raw ingredients.

Use one fetcher per product:

```text
one product owner -> one validated endpoint -> shared card/score/membership readers
```

Canonical product model: [../scoracle-wiki/PRODUCT_NARRATIVE.md](../scoracle-wiki/PRODUCT_NARRATIVE.md).

## Aesthetic Contract

The visual north star is [../scoracle-tokens/AESTHETIC_VISION.md](../scoracle-tokens/AESTHETIC_VISION.md).

Use `@scoracle/tokens` for shared color, type, and asset values. Do not redefine token values in local CSS. The web can own layout and platform-specific interaction, but shared visual doctrine belongs in `scoracle-tokens`.

Reuse brand primitives before creating surface-specific controls. When two controls express the same product idea across cards, scopes, tabs, modes, or repos, prefer extending the shared primitive and token vocabulary over creating a new local component. Local components may own platform behavior, but the naming, posture, and visual doctrine should converge through `scoracle-tokens`.

For selection surfaces, use `NavWell` as the shared brand primitive — one object in the tray well, two rows. Product tabs and sport/board selectors render as engraved caps in the tab row, with the Marker riding above the active item; scopes, seasons, modes, compare, and search compose as segments of the conditions line beneath. Keep the semantics distinct even when the visual language is shared: product switches are tabs, while scopes remain dropdown/select controls on the conditions line — never chips, pills, or boxes.

## Handoff Format

For unfinished multi-step work, end with:

```text
Continue work in scoracle-frontend on branch <branch>.

Read first:
1. README.md
2. ../scoracle-wiki/PRODUCT_NARRATIVE.md
3. ../scoracle-tokens/AESTHETIC_VISION.md

Last completed:
- <summary>

Changed files:
- <files>

Verification run:
- <commands/results>

Next task:
- <specific next step>

Known risks:
- <risks or none>
```

## Production

- Primary: `https://scoracle.com`
- Worker backup: `https://scoracle-frontend.albapepper.workers.dev`
