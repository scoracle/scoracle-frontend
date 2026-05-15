# 2026-05-15 — og:image meta tags on profile.tsx

## Goal

Wire `<meta property="og:image">` + `<meta name="twitter:image">` on
profile pages so X / Facebook / iMessage / Discord auto-fetch the
server-rendered preview from `/og/<cardType>/<sport>/<type>/<id>` when
users share canonical profile URLs. This closes the SSR-meta-tag side
of the OG-only share strategy; step 4d is the production deploy +
verification on X.

Step 4c of the Shell retool sequence.

## What Was Done

### New dep

`@solidjs/meta` — the standard SolidStart head-metadata manager.
Provides `<Title>`, `<Meta>`, and `<MetaProvider>` components that
emit head tags during SSR (and update them reactively on the client).

### `src/app.tsx` — MetaProvider

Router root wraps children in `<MetaProvider>` so per-route `<Meta>`
calls register correctly. No site-wide defaults emitted from inside
the provider — `@solidjs/meta`'s SSR dedup doesn't fully consolidate
across SolidStart's Suspense streaming, so a default + route-override
pair produces TWO meta tags in `<head>` and crawlers pick the first
(the default). Comment in the file documents the trade.

### `src/entry-server.tsx` — slim static head

Dropped the overridable defaults (`og:title`, `og:url`, `og:image`,
`twitter:title`, `twitter:image`) from the static head template. They
were producing duplicates against the @solidjs/meta managed tags.
Kept the never-overridden static tags: `og:type`, `og:site_name`,
`og:description`, `twitter:card`, `twitter:description`.

Consequence: routes that don't emit their own `og:image` (home,
terms, privacy, 404) currently ship with no og:image meta tag.
Acceptable trade — those pages don't have a per-page artifact to
preview anyway. If a generic site-default image preview is wanted on
those routes, add per-route `<Meta>` there (not back to entry-server).

### `src/routes/profile.tsx` — per-route Meta

Removed the `createEffect` that set `document.title` client-side
(superseded by `<Title>` which works server-side too). Added:

- `<Title>{entity.name ?? "Profile"} - Scoracle</Title>` — entity
  name comes from the `$entityInfo` nanostore once `EntityMeta`
  populates it; falls back to "Profile - Scoracle" during SSR + cold
  load.
- `<Meta property="og:title" content={pageTitle()} />` — same title.
- `<Meta property="og:url" content={canonicalUrl()} />` — the share
  URL `https://scoracle.com/profile?sport=...&type=...&id=...&tab=...`
  derived from URL params + activeTab.
- `<Meta property="og:image" content={ogImageUrl()} />` — points at
  `/og/<cardType>/<sport>/<type>/<id>` with cardType keyed off
  activeTab. When activeTab is "vibes", cardType is "vibe" so the OG
  route's VibeCard dispatcher fires; other tabs (news/x/stats/traits/
  compare) currently render the OG route's placeholder image (real
  per-cardType artifacts ship as those Cards become shareable in
  Phase D).
- `<Meta name="twitter:title">` + `<Meta name="twitter:image">` —
  same values, twitter-specific.

## Files Changed

```
package.json
package-lock.json
src/app.tsx
src/entry-server.tsx
src/routes/profile.tsx
docs/progress/2026-05-15_og-meta-tags-on-profile.md (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- `curl /profile?sport=NFL&type=team&id=19&tab=vibes` — verified
  positionally with grep + python:
  - `<meta property="og:image" content="https://scoracle.com/og/vibe/nfl/team/19">` — single tag, in `<head>`.
  - `<meta name="twitter:image" content="https://scoracle.com/og/vibe/nfl/team/19">` — single tag, in `<head>`.
  - `<meta property="og:url" content="https://scoracle.com/profile?sport=NFL&amp;type=team&amp;id=19&amp;tab=vibes">` — single tag, in `<head>`.
  - `<title>Profile - Scoracle</title>` — managed tag, in `<head>`.
  - Static `<title>Scoracle</title>` from entry-server still present
    (browsers use last, crawlers prefer og:title — functionally fine).

## Result

OG meta tags are correctly emitted in the SSR HTML for profile pages.
Social crawlers (X, FB, iMessage, Discord, Slack) will auto-fetch the
preview from the OG route when users paste canonical profile URLs.
**The OG-only share strategy is fully in place at the code level —
step 4d (production deploy + X verification) is the remaining work.**

## What's NOT in this commit (intentional)

- **Production deploy + X share verification** — step 4d.
- **og:image meta tags on non-profile routes** (home, terms, privacy,
  404) — those routes ship without a per-page og:image today. Add
  per-route `<Meta>` later if a default-image preview is wanted there.
- **Duplicate `<title>` cleanup** — entry-server's static `<title>`
  coexists with @solidjs/meta's managed `<title>`. Functionally fine
  (last wins in browsers; crawlers use og:title); cosmetic only.
