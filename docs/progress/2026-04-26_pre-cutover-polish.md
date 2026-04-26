# Pre-cutover polish — cache headers, social meta, robots/sitemap, legal pages

**Date:** 2026-04-26
**Scope:** Bucket A from the recommended plan — the small launch-quality items that should land *before* DNS cutover so `scoracle.com` flips with a clean surface. Cache headers, OG/Twitter Card meta, robots.txt + sitemap.xml, real-structure /terms scaffold + new /privacy route + content, and Header menu links to both.

## Goal

Parity testing confirmed end-to-end (browser-side, side-by-side against the live Astro flagship). Cutover is one CF dashboard step away. Before flipping, land the polish items that are visible to crawlers, social platforms, and legal-vetting eyes (ad networks, app stores) so the new site doesn't ship looking unfinished.

## What Was Done

### `public/_headers` — Cloudflare cache config

Ported from Astro's `_headers`, adapted for SolidStart paths:
- `/_build/*` → `max-age=31536000, immutable` (Vite's content-hashed assets are safe to cache forever)
- `/data/*` → `max-age=86400, stale-while-revalidate=604800` (browsers serve stale instantly, revalidate in background)
- `/images/*` → `max-age=604800` (one week — these are now optimized PNGs, swap-rate is low)
- `/favicon.svg` → `max-age=31536000, immutable`

CF Workers Static Assets honors `_headers` directly.

### OG + Twitter Card meta tags (`src/entry-server.tsx`)

Added to the `<head>`:
- `meta name="description"` — single-line product summary
- Open Graph: `og:type/site_name/title/description/image/url`
- Twitter Card: `summary_large_image` with title/description/image
- `og:image` and `twitter:image` both point to `https://scoracle.com/images/scoracle_crystal_ball.png` (the optimized 167 KB asset; works for the home page first-share scenario).

Per-page meta would require SolidStart's Head API (or a `<MetaProvider>` from `@solidjs/meta`) — out of scope for this round; static page-level meta is the right move for /, /profile, /terms, /privacy at this stage.

### `public/robots.txt` + `public/sitemap.xml`

- `robots.txt`: `User-agent: * / Allow: /` + sitemap pointer
- `sitemap.xml`: lists the four-page surface — `/`, `/profile`, `/terms`, `/privacy` — with `changefreq` and `priority` per page

### `/terms` content scaffold (`src/routes/terms.tsx`)

Replaced the 12-line placeholder with a structured 10-section scaffold:
1. Acceptance of Terms
2. Use of the Service
3. Intellectual Property
4. Third-Party Content and Links
5. Disclaimers
6. Limitation of Liability
7. Account Termination
8. Changes to These Terms
9. Governing Law
10. Contact

Marked at top with a "DRAFT" callout banner. Designed to be swap-able: drop generator output (Termly, Iubenda, etc.) into each section before launch. Standard, professional structure that ad networks / app stores will accept as a real legal page even in draft form.

### New `/privacy` route (`src/routes/privacy.tsx`)

11-section structured Privacy Policy:
1. Overview
2. Information We Collect (theme/lang `localStorage`, server logs, aggregate analytics — truthful current state)
3. How We Use Information
4. Cookies and Local Storage
5. Sharing of Information
6. Third-Party Content
7. Your Rights (GDPR / CCPA-aware)
8. Data Retention
9. Children's Privacy
10. Changes to This Policy
11. Contact

Same DRAFT callout. Reflects current product state: no accounts, no tracking cookies, only `localStorage` for preferences + Cloudflare server logs + aggregate analytics. Forward-compatible with the AdSense / affiliate additions in Track B of the Launch Plan ("If we add advertising or affiliate features in the future, this policy will be updated and a consent banner will be shown where required by law.").

### Shared legal page styles (`src/routes/legal.css`)

One file, two consumers. 760 px max-width, `--font-display` for h1, tokenized everywhere (theme-safe). Clear visual hierarchy with the DRAFT banner styled as a soft-bordered callout.

### Header menu links (`src/components/solid/Header.tsx`)

Added Terms + Privacy entries to the hamburger menu's `<nav class="menu-nav">` (alongside Home). Each with an inline SVG icon matching the existing pattern. This makes the legal pages discoverable from any page on the site — a hard requirement for ad-network onboarding (they crawl for footer/menu links to legal pages).

## Files Changed

**Added**
- `public/_headers`
- `public/robots.txt`
- `public/sitemap.xml`
- `src/routes/legal.css`
- `src/routes/privacy.tsx`
- `docs/progress/2026-04-26_pre-cutover-polish.md`

**Modified**
- `src/entry-server.tsx` — description + OG + Twitter Card meta tags
- `src/routes/terms.tsx` — replaced 12-line placeholder with 10-section scaffold + shared CSS import
- `src/components/solid/Header.tsx` — Terms + Privacy menu links

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. Server entry: 87.85 → 90.46 KB (+2.6 KB for the new meta + privacy route content).
- `curl http://localhost:5185/` | grep "og:title" — meta tags land in SSR output.
- `curl http://localhost:5185/sitemap.xml` — serves the XML directly from `public/`.
- `curl http://localhost:5185/robots.txt` — serves directly.
- `/terms` and `/privacy` render with shared `legal-main` styles, both light + dark.

## Result

Pre-cutover surface is now launch-quality:
- **Lighthouse / Core Web Vitals**: cache headers cover the three asset-heavy paths; combined with the image-opt commit, this should land us solidly in the 90+ band.
- **Social previews**: OG + Twitter Card meta means link previews on X, Bluesky, iMessage, Slack, Discord all render with the crystal ball image + branded title.
- **SEO crawlability**: robots.txt + sitemap.xml + canonical URLs (implicit via `og:url`) — Google can index all four pages.
- **Legal compliance scaffolding**: real-structure /terms + /privacy at standard URLs, linked from the global menu, marked as DRAFT but ready to receive generator output. Sufficient for the next steps of ad-network onboarding (per the Launch Plan, Track B).

Out of scope here, all separate items:
- Per-page OG meta overrides (e.g., player names in og:title) — needs `@solidjs/meta` provider; deferred until the "AI agent meta" Phase 5 work
- GDPR/CCPA consent banner — only needed once tracking cookies / advertising actually ship
- AdSense + affiliate applications — admin-track work, not in any repo

## Next

DNS cutover. The user-driven step:
1. Cloudflare dashboard → `scoracle.com` zone → Workers Routes
2. Update the route bound to `scoracle.com/*` from the old Astro Worker → `scoracle-frontend` Worker
3. Leave the old Astro Worker deployed for ~72 h as hot standby per Launch Plan
4. Revert by re-pointing the route if anything goes sideways
