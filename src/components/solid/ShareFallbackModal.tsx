/**
 * ShareFallbackModal — the desktop / Firefox path when the OS share
 * sheet isn't available.
 *
 * The modal shows the pre-filled post copy and three routes out: open
 * the X composer, open the Facebook composer, or copy the link. Each
 * carries the canonical URL — X and Facebook render the OG card from
 * the link's `og:image` meta, so there's no image to attach or
 * download here.
 *
 * Owned by ShareTrigger, which mounts it on `dispatch()`'s
 * `kind: "fallback"` return.
 */
import { createSignal } from "solid-js";
import "./ShareFallbackModal.css";

export interface ShareFallbackModalProps {
  /** Pre-filled post copy. Shown in the modal, passed to X intent. */
  text: string;
  /** Canonical URL. Pre-filled into X / FB intents, copy-link target. */
  url: string;
  /** Dismiss handler — invoked on backdrop click, close button, or
   *  successful copy. */
  onClose: () => void;
}

export default function ShareFallbackModal(props: ShareFallbackModalProps) {
  const [copyState, setCopyState] = createSignal<"idle" | "copied" | "failed">("idle");

  async function copyLink() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyState("failed");
      return;
    }
    try {
      await navigator.clipboard.writeText(props.url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  function openComposer(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    props.onClose();
  }

  const xUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: props.text, url: props.url }).toString()}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(props.url)}`;

  const copyLabel = () => {
    const s = copyState();
    if (s === "copied") return "Copied!";
    if (s === "failed") return "Copy failed";
    return "Copy link";
  };

  return (
    <div class="share-fallback-modal" role="dialog" aria-label="Share this card">
      <div class="share-fallback-backdrop" onClick={props.onClose} />
      <div class="share-fallback-panel">
        <button class="share-fallback-close" onClick={props.onClose} aria-label="Close">×</button>
        <div class="share-fallback-text">{props.text}</div>
        <div class="share-fallback-actions">
          <button type="button" onClick={() => openComposer(xUrl)}>Open X</button>
          <button type="button" onClick={() => openComposer(fbUrl)}>Open Facebook</button>
          <button type="button" onClick={copyLink}>{copyLabel()}</button>
        </div>
        <div class="share-fallback-hint">
          X and Facebook generate the card preview from the link.
        </div>
      </div>
    </div>
  );
}
