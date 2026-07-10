# 2026-07-10 - AdSense Review SSR-Only Documents

## Goal

Move AdSense/Google review surfaces behind a true SSR-only boundary. The prior
client-side hydration skip still required the entry bundle to load and evaluate,
which left room for SolidStart's client fallback to replace useful server HTML.

## What Changed

- Added shared review request detection for:
  - Google crawler/review user agents
  - AdSense/ad-preview referrers
  - cross-site iframe document requests
- Marked review documents with `data-scoracle-render="review-ssr"` and
  `<meta name="scoracle-render-mode" content="review-ssr">`.
- Omitted theme, AdSense, and SolidStart client scripts from review SSR.
- Stripped Solid hydration scripts and `modulepreload` links from review HTML in
  middleware while preserving stylesheet links and route metadata.
- Applied review-only headers:
  - `Content-Security-Policy` with `script-src 'none'`
  - `Cache-Control: no-store`
  - `Vary: User-Agent, Referer, Sec-Fetch-Dest, Sec-Fetch-Site`
- Kept normal top-level requests on interactive SolidStart hydration.

## Verification

- `npm run typecheck`
- `npm test`
- `npm test -- review-request`
- `npm run cf:build`
- Built-handler smoke:
  - normal `/` renders `interactive`, includes the entry client, includes AdSense
  - AdSense-referrer `/` renders `review-ssr`, has zero `<script>` tags, has no
    `modulepreload`, has no AdSense loader, and sets `Cache-Control: no-store`
  - cross-site iframe `/` renders `review-ssr`, has zero `<script>` tags, and has
    no `modulepreload`

## Result

Review/crawler iframe surfaces now receive complete server-rendered HTML that
cannot be replaced by SolidStart's client fallback. Normal users still receive
the full hydrated app and eager product warmup path.

