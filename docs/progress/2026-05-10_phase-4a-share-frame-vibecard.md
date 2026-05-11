# Phase 4a — ShareFrame + share-from-VibeCard (client-side)

**Date:** 2026-05-10
**Scope:** Phase 4 of the v2 build-out, sub-phase a. Builds the `<ShareFrame>` wrapper component and wires a working share affordance on `VibeCard`. Client-side render path only — server-side OG image route lands in Phase 4b.

## Goal

The v2 brand intentionally keeps Cards minimal in-app (no logo, no entity name on the Card itself per the *card format = brand identity* rule). The Share Frame is the resolution: at share-time, the Card gets wrapped in a frame with header (entity identification) + footer (Scoracle attribution), so an outbound share artifact is self-identifying without forcing chrome into the live experience. Phase 4a ships the headline shareable surface — VibeCard — and validates the snapshot path before committing to the trickier server-side OG render in 4b.

Per [[Share Frame]], this implements:
- The frame anatomy (header band + Card area + footer band).
- v0 4:5 aspect (portrait — natural fit for VibeCard).
- Client-side snapshot via `html-to-image` → `Web Share API` (mobile, supported desktop) or `download + clipboard URL copy` (universal fallback).
- The two locked rules: only Cards get framed; attribution lives in the Frame, never the Card.

## What Was Done

### 1. New dependency: `html-to-image`

`npm install html-to-image` → `^1.11.13` added to `package.json`. Modest weight (~30KB), well-supported, exports PNG/SVG/JPEG.

### 2. New `<ShareFrame>` component

`src/components/solid/ShareFrame.tsx` + `ShareFrame.css`.

Three bands:

```
┌─────────────────────────────────────┐  ← share-frame-header
│  [logo]  Stephen Curry              │     - 56×56 image (left)
│          Golden State · NBA         │     - Tan Nimbus name (top)
│                                     │     - Sentient italic context (below)
├─────────────────────────────────────┤
│                                     │
│            [the Card itself]        │  ← share-frame-card-area
│                                     │     - children — pixel-identical
│                                     │       to the in-app render
│                                     │
├─────────────────────────────────────┤  ← share-frame-footer
│  ◉  scoracle.com/profile?…   May 10 · vibe
└─────────────────────────────────────┘
```

Fixed dimensions (600 × 750 = 4:5 portrait). Renders at 2× pixelRatio via html-to-image for crisp share output (1200 × 1500). Uses the same v2 chrome tokens as the live cards (Bone surface, paper-on-desk shadow, hairline footer divider via Faded sand).

The frame is render-time only — the consuming Card mounts it inside a `<Portal>` off-screen at share-click and unmounts it after the snapshot resolves. It's never visible in the running app.

The footer crystal-ball mark is a placeholder Unicode glyph (◉) for v0; can swap for an SVG of the actual logo in a follow-up. URL is rendered with protocol stripped for cleaner display. Date formatted as `Month D, YYYY` via `toLocaleDateString`.

### 3. Share button + snapshot flow on `VibeCard`

`src/components/solid/VibeCard.tsx` rewritten:

- **Card body** extracted into a `cardBody()` helper that returns fresh JSX. Called twice — once inline (the in-app render the user sees) and once inside `<ShareFrame>` at share-time. Same data, same reactive accessors, same render — guaranteed visual parity.
- **Share affordance** at top-right of the card: 24×24 button with a small line-art share icon (arrow-out-of-tray). Soft sand color (matches the chrome layer), darkens on hover. Mirror-positioned with the bottom-right corner numeral. Inline SVG; no new asset.
- **Share state**: two signals — `shareOpen` (whether the off-screen ShareFrame is mounted) and `sharing` (whether a share is in flight; disables the button to prevent double-fire).
- **`handleShare()`**: sets `shareOpen=true`, awaits two `requestAnimationFrame` ticks (so Portal mounts + image elements paint before snapshotting), captures via `toBlob` with `pixelRatio: 2` and `backgroundColor: '#FAF3E3'` (Bone — fills behind the frame), then dispatches:
  - **Web Share API path:** `navigator.canShare({ files: [file] })` true → `navigator.share({ files, text, url })`. Mobile + supported desktops (Chrome on macOS/Windows, Safari).
  - **Download fallback:** create `<a download>` link, click it, revoke object URL. Plus copy canonical URL to clipboard via `navigator.clipboard.writeText` so user can paste-into-channel after dropping the image.
- Both paths handle user-cancellation silently (`AbortError` swallowed); other errors logged to console for debugging.
- `setShareOpen(false)` in `finally` so the off-screen frame unmounts after the share resolves.

### 4. Entity facts for the Share Frame header

Reading from `entityDataStore` (the same source `EntityMeta` reads from on the live page):

- For players: name + headshot (`photo_url`) + `{team} · {SPORT}` context. Falls back to team logo if no headshot.
- For teams: name + logo + `{city} · {SPORT}` context.

The lookup is synchronous (`getPlayerMetaSync` / `getTeamMetaSync`) — the data is already loaded by the profile route's `firePreloads()` + `entityDataStore.preloadAll()`, so no async wait at share-time.

### 5. Canonical URL

Built at share-time from the current `window.location.origin` + the `sport`/`type`/`id` from `useProfile()` context. Format: `https://scoracle.com/profile?sport=NBA&type=player&id=237`. Stripped of protocol when rendered in the footer.

## Files Changed

**Added:**
- `src/components/solid/ShareFrame.tsx`
- `src/components/solid/ShareFrame.css`

**Modified:**
- `src/components/solid/VibeCard.tsx` — share button, off-screen ShareFrame Portal, `handleShare()` flow, `cardBody()` helper, entity-facts lookup, canonical-URL builder
- `src/components/solid/VibeCard.css` — `.vibe-card-wrapper` + `.vibe-share-btn` styles
- `package.json` + `package-lock.json` — `html-to-image` dependency

**Vault:**
- `~/scoracleWiki/Progress/scoracle-frontend/2026-05-10_phase-4a-share-frame-vibecard.md` (mirror)
- `~/scoracleWiki/wiki/Changelog.md` — new row

## Verification

```bash
npx tsc --noEmit       # passes
npx vitest run         # 92 tests pass (no new test surface for this commit;
                       #  ShareFrame and VibeCard share flow are integration-tested
                       #  in the browser, not unit tests)
```

Browser-side smoke (any profile page → News mode → Vibes tab):
- Small share icon at top-right of the vibe card, Soft sand color.
- Click → image is captured, share dialog or download triggers.
- On mobile (iOS Safari / Android Chrome): native share sheet opens with the framed PNG, predefined caption text + canonical URL.
- On desktop: PNG downloads to default download folder; canonical URL is copied to clipboard.
- Share icon dims while in flight (`is-busy` class), prevents double-click.

## Result

Phase 4a is shipped. Users can share their Scoracle vibe cards as self-identifying PNGs. The Card itself stays minimal in the live app; the Share Frame earns identification only at share-time. The locked rules hold:
1. Only the VibeCard (a Card per the [[Component Hierarchy]]) gets framed — the surrounding ContentShell does not.
2. All entity identification (image, name, context) and Scoracle attribution (mark, URL, timestamp) live in the Frame, never on the Card.

## Implications + carry-forwards

- **Phase 4b (OG image route)** is the next major piece. SSR-side render via Satori or `resvg-js`, accessible at `/og/<sport>/<type>/<id>/<card>.png`, returning the same framed render. Bundles a serif font server-side (system Georgia isn't available in Cloudflare Workers' SSR environment) — Source Serif or Charter is the natural pick. Adds `<meta property="og:image">` to profile routes pointing at the OG endpoint.
- **Phase 4c** rolls share to `TraitsCard`, `GraphsCard`, `CompareCard`. Each Card opts in via a `shareable` prop (default true for those three; default false on `MetaCard`, `ArticlesCard`, `XCard`).
- **Aspect-ratio variants** (1:1, 9:16, 16:9) come in 4b alongside the OG route — they're more useful for OG previews on different platforms (Twitter wants 16:9 or 1.91:1; Instagram wants 4:5 or 1:1) than they are for in-app share.
- **The Web Share API path** depends on browser support for `Files` in the share payload. Confirmed working on iOS 15+, Chrome on Android, Chrome / Safari on macOS Big Sur+. Falls back to download + clipboard automatically; no flag, no UA sniff.
- **CORS on entity images:** the headshot/logo URLs come from `api-sports`. If those fail CORS, html-to-image silently renders without the image (the rest of the share frame snaps fine). Worth verifying with real api-sports URLs at production deploy. If CORS is a problem, the fix is to proxy the image through scoracle's API (which is same-origin) — a small follow-up if needed.
- **Footer crystal-ball glyph** is a placeholder Unicode `◉` for v0. Future work: extract a small SVG of the brand's actual crystal-ball mark (or the deck-back's centered glyph) for sharper visual identity.
- **Share text:** currently hardcoded as `${entityName} · vibe ${score} · ${archetype}`. Reasonable v0 default; a follow-up could let users tweak it before sharing.

## Related

- `~/scoracleWiki/wiki/Architecture/Share Frame.md` — full design spec this implements
- `~/scoracleWiki/wiki/Architecture/Vibe Score Surface.md` — VibeCard spec; Share Frame is the outbound surface for it
- `~/scoracle-frontend/docs/progress/2026-05-09_v2-vibecard-rewrite.md` — VibeCard v2 the share button was added to
