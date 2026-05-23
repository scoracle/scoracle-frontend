# 2026-05-23 — Share dispatch: no-store fetch + fallback UX

## Goal

Two improvements to the share flow surfaced by hands-on testing:

1. **Cache busting in the dispatch fetch.** The OG route returns
   `Cache-Control: public, max-age=300, stale-while-revalidate=86400`
   for CDN / cross-user reuse. Per-tab, that means an early share
   click that happened before the data fully resolved leaves a stale
   PNG cached in the browser, and subsequent clicks keep serving that
   stale render — so the user sees a "card with the meta header right
   but the body empty" even after the server-side render is producing
   the correct artifact.
2. **Fallback modal UX.** Open X / Open Facebook can't attach a file
   to a remote composer via URL — only text + URL go through. The user
   has to manually drag the downloaded PNG into the composer, but the
   old flow required two separate clicks (Download, then Open X) and
   the hint copy didn't make this clear.

## What Was Done

`src/lib/share/dispatch.ts`:
- `fetch(input.pngUrl, { cache: "no-store" })` for the PNG pull. The
  OG route's server-side cache headers still benefit downstream CDN /
  social-platform consumers (Twitter card meta, Facebook OG fetch);
  per-tab browser cache is bypassed for the dispatch fetch itself.

`src/components/solid/ShareFallbackModal.tsx`:
- Open X / Open Facebook are now `<button>`s, not `<a>`s. On click
  they call a new `openComposer(url)` helper that triggers
  `downloadPng()` first (unless already downloaded), then opens the
  composer in a new tab. The PNG lands in the user's Downloads tray
  before the composer tab focuses, so they can drag it in immediately.
- Added a `downloaded` signal so the Download button shows
  "Downloaded ✓" once tapped; openComposer skips re-downloading if
  the user already hit Download manually.
- Hint copy refreshed to explain: "Open X or Facebook also downloads
  the image — drag it into the composer when it opens. (Composers
  can't auto-attach files.)"

## Files Changed

- `src/lib/share/dispatch.ts` — cache: no-store
- `src/components/solid/ShareFallbackModal.tsx` — combo download + open

## Verification

- `npm run typecheck` — clean
- `npm test` — 131/131

UI not opened in the browser this commit. Manual test plan: hard-refresh
the page, click share on any Card, click Open X — image should land in
Downloads and the X composer should open in a new tab.

## Result

The "blank card body in share preview" issue should be gone after
hard-refresh (or any new share click since `no-store` bypasses the
stale cache). Open X / Open Facebook now do the right thing for the
user with one click instead of two.

## Notes on platform-side share behavior (not bugs, localhost-specific)

- **X composer doesn't auto-linkify localhost URLs** during composition.
  In production with `scoracle.com` URLs, X will linkify on post AND
  fetch the share-card meta image via OG meta tags (separate work item
  — wire up `<meta og:image>` in the route head pointing at the same
  `/og/...` URL).
- **Facebook sharer.php with a localhost URL** can't fetch OG metadata,
  so the composer opens blank. Same fix-via-production-URLs applies.
- **Neither X nor Facebook supports file attachment via intent URL** —
  that's a platform limitation across the entire web, not specific to
  this implementation. Drag-from-download is the universal workaround;
  the new fallback UX makes that the one-click path.
