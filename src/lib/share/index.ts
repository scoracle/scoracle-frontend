/**
 * Public surface of the share handler module.
 *
 * Cards that want share capability render `<ShareButton url={...}
 * text={...} />` inside their body. The button positions itself absolute
 * top-right of the wrapping Shell, opens the OS share sheet on
 * Web-Share-capable platforms, and falls back to a tiny three-button
 * popover (X / Facebook / Copy link) on desktop.
 *
 * The artifact preview that X / Facebook / iMessage show in their feeds
 * is fetched server-side via the canonical URL's `<meta og:image>` tag
 * (which points at `/og/<cardType>/<sport>/<type>/<id>`). The OG route
 * lives in `src/routes/og/`; the per-Card SVG renderers live alongside
 * each Card (e.g., `vibeArtifactSvg` in `VibeCard.tsx`).
 */

export { default as ShareButton } from "./ShareButton";
export {
  buildXIntentUrl,
  buildFacebookShareUrl,
  copyToClipboard,
  tryWebShare,
  canWebShare,
} from "./intents";
