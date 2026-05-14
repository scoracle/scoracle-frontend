/**
 * ShareButton — public share API for any Scoracle Card.
 *
 * Drop one of these into a Card with the entity + tab + share text +
 * a `preview` render function and the entire share flow comes for
 * free: small share icon, modal with live preview, X / Facebook /
 * Copy link / Download image actions, focus management, and the
 * html-to-image snapshot pipeline.
 *
 * Three of the four actions (X / Facebook / Copy link) work today.
 * The fourth (Download image) reuses the existing html-to-image dep
 * — no new packages.
 *
 * Cards that adopt this drop the ad-hoc snapshot wiring entirely.
 * Future TraitsCard / CompareCard / StatsCard adopt by importing
 * `<ShareButton>` and passing their own framed-card `preview()`
 * function plus a tab + cardType label.
 */

import { createSignal, type JSX } from "solid-js";
import { toBlob } from "html-to-image";
import { buildShareUrl, type ShareEntity, type ShareTab } from "../../lib/utils/share-url";
import ShareModal from "./ShareModal";
import "./ShareButton.css";

export interface ShareButtonProps {
  /** Sport / type / id for the canonical URL + download filename. */
  entity: ShareEntity;
  /** Which Card the shared link should open on (e.g., "vibes"). Optional —
   *  omit when the card has no specific deep-link target. */
  tab?: ShareTab;
  /** Card-type label baked into the download filename
   *  (`scoracle-{cardType}-{name}.png`). */
  cardType: string;
  /** Display name used to build the download filename. */
  entityName: string;
  /** Suggested post text — appears in X's composer + the "Copied"
   *  text/clipboard write. */
  shareText: string;
  /** Live JSX rendered inside the modal preview AND captured by
   *  html-to-image at download. Typically `() => <ShareFrame
   *  ...>{cardBody()}</ShareFrame>`. The function shape lets Solid
   *  re-evaluate it cleanly whenever the modal opens. */
  preview: () => JSX.Element;
  /** Optional extra class on the trigger button — for site-specific
   *  positioning (e.g., `vibe-share-btn` on VibeCard). */
  class?: string;
  /** ARIA label for the trigger button. Defaults to `Share this card`. */
  ariaLabel?: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ShareButton(props: ShareButtonProps) {
  const [open, setOpen] = createSignal(false);
  let previewRef: HTMLDivElement | undefined;

  const canonicalUrl = () => buildShareUrl(props.entity, props.tab);

  async function handleDownload() {
    if (!previewRef) return;
    // Give image children a tick to settle (vibe-art SVG, entity image, etc.).
    // Two rAFs cover the cold-render race where an img is in-flight when
    // toBlob would otherwise paint a half-loaded canvas.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      const blob = await toBlob(previewRef, {
        pixelRatio: 2,
        backgroundColor: "#F2EBDC", // Bone — matches .vibe-card / .share-frame surface
        cacheBust: true,
      });
      if (!blob) return;

      const slug = slugify(props.entityName) || "entity";
      const filename = `scoracle-${props.cardType}-${slug}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Mobile path — let the OS share sheet take the file directly
      // when available. Otherwise fall through to a plain download.
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            text: props.shareText,
            url: canonicalUrl(),
          });
          return;
        } catch (err) {
          // User cancellation throws AbortError — that's fine, fall back
          // to the download path so they still walk away with a PNG.
          if (err instanceof Error && err.name !== "AbortError") {
            // eslint-disable-next-line no-console
            console.error("ShareButton: navigator.share failed:", err);
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("ShareButton: download failed:", err);
    }
  }

  return (
    <>
      <button
        type="button"
        class="share-btn"
        classList={{ [props.class ?? ""]: !!props.class }}
        aria-label={props.ariaLabel ?? "Share this card"}
        title="Share"
        onClick={() => setOpen(true)}
      >
        <ShareIcon />
      </button>

      <ShareModal
        open={open()}
        onClose={() => setOpen(false)}
        canonicalUrl={canonicalUrl()}
        shareText={props.shareText}
        onDownload={handleDownload}
        previewRef={(el) => { previewRef = el; }}
      >
        {props.preview()}
      </ShareModal>
    </>
  );
}

function ShareIcon() {
  // Simple share / upload glyph — arrow rising out of a tray, line-art.
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M7 9 V 1.5" />
      <path d="M4 4.5 L 7 1.5 L 10 4.5" />
      <path d="M2.5 7 V 12 H 11.5 V 7" />
    </svg>
  );
}
