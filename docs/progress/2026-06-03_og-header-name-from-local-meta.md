# 2026-06-03 — OG header name from local meta (fix "Unknown")

## Goal

Share cards rendered "Unknown" in the header instead of the entity's name (e.g. the
Savinho card). Fix it — and wire the player photo / team crest into the header while we're
there.

## What Was Done

- **Root cause:** `getOgEntityFacts` read the name from the API entity endpoint
  (`/{sport}/{type}/{id}`), but that endpoint serializes the stats view — it carries
  `position/stats/percentiles` but **no name** (name lives in `public.players`). So it
  always fell back to "Unknown" for football. No per-entity name endpoint exists, and the
  API meta/autofill is 5.9 MB — too heavy per render.
- **Fix (frontend-only, no backend):** read the SAME bundled local meta the in-app
  autocomplete + `EntityMeta` use — `/data/{sport}-meta.json` (1.3 MB, already shipped as a
  static asset). `getOgEntityFacts` now loads it via the handler's **event-bound**
  `fetchAsset` and resolves name / image / subtitle mirroring `EntityMeta`'s
  resolvePlayer/resolveTeam.
  - Why event-bound (not `entityDataStore.loadMeta`): the store reads via
    `getCloudflareEnv()` → `getRequestEvent()`, which is out of scope in an OG **API** route
    (per `cloudflare-env.ts`), so it would silently no-op in prod. The route's `fetchAsset`
    (already used for fonts/wasm/frame) works in both dev and prod. Per-isolate cache so the
    JSON is parsed at most once per sport.
- **Bonus:** player photo (`photo_url`, falling back to the team crest for NBA/NFL) and
  team subtitle now populate the header → sets up the logo/image souping-up.

## Files Changed

`lib/og/entity-facts.server.ts` (rewritten — local meta via fetchAsset; dropped the API call
+ `query()` wrapper), `routes/og/[cardType]/…/[id].ts` (pass `fetchAsset` to getOgEntityFacts).

## Verification

`npm run typecheck` clean; `npm test` 97/97; local harness (mock fetchAsset → disk) resolves
`{name:"Savinho", imageUrl:<photo>, subtitle:"Manchester City"}` for the player and
`{name:"Manchester City", imageUrl:<crest>, subtitle:"Manchester"}` for the team; `npm run
build` clean. Live verification post-deploy.

## Result

OG headers show the real name + photo/crest, sourced from the local meta store — no backend,
no "Unknown". Next: soup up the header image treatment (bigger photo / team crest).
