# 2026-05-15 — Slim Shell + new client share handler + VibeCard adopts

## Goal

Slim `Shell.tsx` to ~80 lines of pure chrome and replace the in-Shell
share apparatus with a dedicated `src/lib/share/` handler module. Cards
that share now render `<ShareButton url={…} text={…} />` inside their
own body — Shell knows nothing about share. The OG-only strategy means
share is a thin client-side trigger; the artifact preview is fetched
server-side from `/og/...` by the receiving platform.

Step 5 of the Shell retool sequence. Step 6 deletes the legacy
`ShareButton.tsx` / `ShareModal.tsx` / `ShareFrame.tsx` (now orphan) and
drops the `html-to-image` dep.

## What Was Done

### New module `src/lib/share/`

- **`intents.ts`** — pure URL builders + clipboard / Web Share wrappers.
  No UI. Exports `buildXIntentUrl`, `buildFacebookShareUrl`,
  `copyToClipboard`, `tryWebShare`, `canWebShare`.
- **`ShareButton.tsx`** — the single inline button shareable Cards
  render. ~32×32 hairline-bordered square-with-arrow glyph. Positions
  absolute top-right of the wrapping Shell (Shell has `position:
  relative` via `.card`). On Web-Share-capable platforms (mobile + some
  desktops) the click fires `navigator.share({url,text})` and skips the
  popover; on desktop without Web Share, a tiny three-button popover
  drops below — `Post to X`, `Post to Facebook`, `Copy link`. No
  preview pane: the OG-only design lives on the receiving platform.
- **`ShareButton.css`** — button + popover styling, brand-consistent
  with the rest of the chrome.
- **`index.ts`** — public surface (`ShareButton` + the `intents.ts`
  helpers).

### `Shell.tsx` — slim (189 → 88 lines)

Stripped:

- `share` prop + `ShellShareMeta` / `ShellShareEntityMeta` /
  `ShellShareSecondaryEntityMeta` interfaces.
- `ShareButton` + `ShareFrame` + `buildShareUrl` / `ShareEntity` /
  `ShareTab` imports.
- `useShell()` + `ShellContext` + `[publishedLabel, setPublishedLabel]`
  signal + `effectiveLabel()` reconciliation — the context path lost
  its last consumer in step 2a.
- The `<Show when={props.share}>{...}</Show>` render block that mounted
  the share button + modal + frame composition (and the render-double
  pattern that came with it — `props.children` rendered twice when the
  modal was open).

Kept: `cornerLabel` prop (the canonical corner-slot mechanism),
`unlockHeight`, `as` / `aria-label` / `class` / `classList` / `children`
/ `ref`. The component is now pure chrome.

### `VibeCard.tsx` — adopts the new ShareButton

- Dropped the `share={{…}}` metadata object from its `<Shell>`.
- Renders `<ShareButton url={canonicalUrl()} text={shareText()} />`
  inside its body. Positions absolute top-right of the Shell.
- `canonicalUrl()` builds the share URL inline:
  `https://scoracle.com/profile?sport=NFL&type=team&id=19&tab=vibes` —
  this is the URL X / FB crawl for the og:image meta tag.
- `shareText()` unchanged.

### `global.css` — orphan rule removed

Dropped `.shell > .share-btn { position: absolute; ... }`. The new
`<ShareButton>` carries its own positioning in `ShareButton.css`.

## Files Changed

```
src/components/solid/Shell.tsx
src/components/solid/VibeCard.tsx
src/global.css
src/lib/share/index.ts            (NEW)
src/lib/share/intents.ts          (NEW)
src/lib/share/ShareButton.tsx     (NEW)
src/lib/share/ShareButton.css     (NEW)
docs/progress/2026-05-15_shell-slim-share-handler.md  (this doc, NEW)
```

## Verification

- `npm run typecheck` — clean.
- `npm test` — 101/101.
- Visual on dev server (`http://localhost:5174`):
  - VibeCard top-right has the new icon button.
  - Click → small popover with X / Facebook / Copy link rows.
  - X / Facebook rows open intent URLs in new tabs.
  - "Copy link" flips to "Copied!" briefly, then back.
  - Outside-click / Escape closes the popover.
  - Legacy modal (preview image + big SHARE ON X / SHARE ON FACEBOOK /
    COPY LINK rows) is gone — `<Shell>` no longer mounts the
    legacy ShareButton/Modal/Frame chain.
- User confirmed visually.

## Result

Shell is now a presentation-only primitive — exactly the "frame to the
Card's picture" vision the user articulated. The share apparatus has a
dedicated home (`src/lib/share/`), independent of Shell. Cards opt into
share by rendering `<ShareButton>` in their body; no shared metadata
object, no internal Shell wiring. The new module is small (~330 lines
vs the legacy ~790 lines including modal + frame).

## What's NOT in this commit (intentional)

- **Legacy files still on disk:** `src/components/solid/ShareButton.tsx`,
  `ShareModal.tsx`, `ShareFrame.tsx` (+ their .css files) are now
  unreferenced but not yet deleted. Step 6 removes them and drops
  the `html-to-image` dependency.
- **Orphan comments:** a handful of CSS / TS comments still mention
  `useShell()?.setCornerLabel` (in `global.css`, `EntityMeta.css`,
  `profile.tsx`). Cosmetic only; cleaned up in step 6.
- **Wiki Component Hierarchy.md update:** Rule 3 ("Shareability is a
  single `share` prop on Shell — opt in by passing metadata") needs a
  rewrite to reflect the new ownership. Lands with step 6 alongside
  the legacy-file deletes.
- **ContentShell.css `min-height: 800px`** — still present; step 7
  removes it as part of the CLS investigation.
