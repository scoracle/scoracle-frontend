# 2026-05-11 — AdSense gutter ad-rail infrastructure

## Goal

Build the AdSense ad-rendering infrastructure during the 1–14 day site
review window so slot IDs can be wired the moment Google approves
monetization for `scoracle.com`. Premium-feel placement: one vertical ad
per side in the empty gutters flanking the centered content column on
the home and profile routes.

## What Was Done

- **`AdSlot` primitive** (`src/components/solid/AdSlot.tsx` + `.css`).
  Generic ad-unit component. Renders an `<ins class="adsbygoogle">` and
  fires `(window.adsbygoogle ||= []).push({})` in `onMount` (client-only
  via `isServer` guard — AdSense touches `window` and cannot run during
  Cloudflare Workers SSR). Reserves `min-height` to prevent CLS at
  ad-load time. When `slot` prop is undefined (current pre-approval
  state), the `<ins>` tag is not rendered — only the reserved space.
  Publisher ID is env-driven (`VITE_ADSENSE_PUBLISHER_ID`) with the
  scoracle.com pub ID as fallback, so future site rolls can use their
  own AdSense accounts if desired.

- **`GutterAds` wrapper** (`src/components/solid/GutterAds.tsx` + `.css`).
  Two `<aside>` rails (left + right) using `AdSlot` internally,
  anchored to the viewport edges (`left: 1rem` / `right: 1rem`) so they
  never overlap the centered 600px content column at any viewport.
  Breakpoints:
    - `< 1100px`: hidden (no gutter room).
    - `1100–1399px`: 160px-wide skyscraper format.
    - `≥ 1400px`: 300px-wide vertical format.

  **Dynamic-height frame + sticky inner ad.** The outer `<aside>` is
  `position: absolute` within `<main>` (which becomes a positioning
  context via `position: relative`), spanning the full content height
  — `top: 0; bottom: 1rem` — so the visual frame matches whatever the
  page contains. Inside, the actual 600px ad is wrapped in a
  `position: sticky; top: 4.5rem` div, so it pins just below the
  3.5rem sticky header and follows the user down the page as they
  scroll, then unpins gracefully when the rail's bottom approaches.
  This is the "premium swimming sidebar" pattern (NYT / Vox / Bloomberg
  use it for top-tier sidebar inventory).

  Single ad per side — never stacked. Scoracle is high-intent
  sports-research traffic; ad providers reward sparse premium
  inventory over high-density.

  Click-handling: the outer `<aside>` has `pointer-events: none` so
  clicks pass through the empty space below the ad. Only the inner
  sticky wrapper intercepts clicks (the ad creative itself).

- **Wired into home and profile routes**. `<GutterAds />` is rendered
  inside the `<main>` element of `routes/index.tsx` and `routes/profile.tsx`.
  Opt-in per route — `/privacy`, `/terms`, and any future utility pages
  remain ad-free.

- **Dev-mode debug outlines**. Set `document.body.dataset.adsDebug = "1"`
  in the console to see dashed outlines + "AD SLOT" labels on every
  AdSlot. Production users never see this.

Both pillars (`AdSlot` and `GutterAds`) are extract-ready — no
flagship-specific imports. They migrate cleanly to `@scoracle/ui` once
the sandbox repo kicks off.

## Files Changed

- `src/components/solid/AdSlot.tsx` (new) — primitive
- `src/components/solid/AdSlot.css` (new) — slot styling + debug outlines
- `src/components/solid/GutterAds.tsx` (new) — wrapper
- `src/components/solid/GutterAds.css` (new) — fixed-rail positioning + breakpoints
- `src/routes/index.tsx` — `<GutterAds />` after `central-card`
- `src/routes/profile.tsx` — `<GutterAds />` after `<ContentShell />`

## Verification

- `npm run typecheck` clean.
- Local dev (`npm run dev`):
  - Home page at `localhost:5173/` on a wide viewport (≥1100px) shows
    nothing visible (no slot IDs yet) but no layout shift; on a narrow
    viewport, no rendered rails at all.
  - With `document.body.dataset.adsDebug = "1"`, dashed outlines + "AD
    SLOT" labels appear in the gutters at wide viewports.
- Production: ads serve once slot IDs are wired post-approval.

## Result

Ad-rendering infrastructure shipped and dormant. Activation is a
one-line change per slot once AdSense approves the site and ad units
are created in the console:

```tsx
<GutterAds leftSlot="1234567890" rightSlot="0987654321" />
```

Next blocker: Google's review of `scoracle.com` (in flight from the
2026-05-11 verification-script commit). No further code work needed
until approval lands.
