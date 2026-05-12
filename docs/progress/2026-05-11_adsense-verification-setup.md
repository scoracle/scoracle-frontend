# 2026-05-11 — AdSense verification setup

## Goal

Unblock Google AdSense site review for `scoracle.com` by placing the
required ownership-verification script and `ads.txt` record. Site is in
"Requires review" state in the AdSense console; verification is the gate
before review can begin (typical review window is 1–14 days).

## What Was Done

- Inserted the AdSense loader `<script>` into the document `<head>` in
  `src/entry-server.tsx`. The script doubles as Google's site-ownership
  verification mechanism — its presence on every page is what AdSense
  crawls for to confirm the property is ours.
- Created `public/ads.txt` with the DIRECT record for publisher ID
  `pub-9821466912189944`. Cloudflare Workers serves it from
  `scoracle.com/ads.txt` via the static-assets handler.
- **Whitelisted AdSense domains in the CSP** (`src/middleware.ts`). The
  existing CSP was strict (`script-src 'self' ...`) and would have
  blocked both the verification crawler and live ad serving. Added the
  standard Google ad-tech wildcards to `script-src` and a new
  `frame-src` directive for ad-creative iframes:
    - `script-src`: `*.googlesyndication.com`, `*.googleadservices.com`,
      `*.google.com`, `*.doubleclick.net`, `tpc.googlesyndication.com`,
      `*.adtrafficquality.google` (SODAR fraud-detection module)
    - `frame-src`: `*.googlesyndication.com`, `*.doubleclick.net`,
      `*.google.com`, `*.adtrafficquality.google`
  Wildcards are the documented AdSense posture — Google rotates serving
  subdomains, so narrower lists break unpredictably.

Auto Ads, anchor ads, and vignette ads are intentionally left disabled
in the AdSense console — we're going manual-units only to preserve the
snappy/clean pillar and integrate cleanly with the gutter-rail layout.

The actual ad units (`<AdSlot>` component, `<GutterAds>` wrapper, profile
route integration) will be built during the 1–14 day review window so
the slot IDs can be wired the moment approval lands.

## Files Changed

- `src/entry-server.tsx` — added AdSense loader script in `<head>`
- `public/ads.txt` — new file with DIRECT publisher record
- `src/middleware.ts` — added AdSense domains to CSP `script-src` and new `frame-src`

## Verification

- After deploy:
  - `curl -I https://scoracle.com/ads.txt` returns 200 with the DIRECT line.
  - View source on any page → AdSense `<script>` present in `<head>`.
- In AdSense console → check "I've placed the code" → **Verify** → then
  hit **Request review** at the bottom of the panel.

## Result

Verification + `ads.txt` shipped. Review request can now be submitted in
the AdSense console. Ads will not serve until approval, which is the
expected steady-state for the next 1–14 days. Infrastructure work
(AdSlot component, gutter wrapper) proceeds in parallel.
