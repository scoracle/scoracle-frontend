/**
 * ShareFallbackModal — the desktop / Firefox path when the OS share
 * sheet isn't available.
 *
 * The modal renders the actual tarot PNG (so the user sees what
 * they'd be sharing), the pre-filled post copy, and four explicit
 * routes out: download the PNG, open the X composer, open the
 * Facebook composer, or copy the link. The user manually attaches
 * the downloaded PNG into whichever composer they open.
 *
 * Owned by ShareTrigger, which mounts it on `dispatch()`'s
 * `kind: "fallback"` return.
 */
import { createSignal, onCleanup } from "solid-js";
import "./ShareFallbackModal.css";

export interface ShareFallbackModalProps {
  /** The fetched PNG — shown as a preview and offered as a download. */
  blob: Blob;
  /** Pre-filled post copy. Shown in the modal, passed to X intent. */
  text: string;
  /** Canonical URL. Pre-filled into X / FB intents, copy-link target. */
  url: string;
  /** Dismiss handler — invoked on backdrop click, close button, or
   *  successful copy. */
  onClose: () => void;
}

export default function ShareFallbackModal(props: ShareFallbackModalProps) {
  const imgUrl = URL.createObjectURL(props.blob);
  onCleanup(() => URL.revokeObjectURL(imgUrl));

  const [copyState, setCopyState] = createSignal<"idle" | "copied" | "failed">("idle");
  const [downloaded, setDownloaded] = createSignal(false);

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

  function downloadPng() {
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = "scoracle.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
  }

  /* Open X / Open Facebook also trigger the download — the composers
   * can't accept a file attachment via URL params, so the user always
   * has to drag the PNG in manually. Pre-downloading on the same click
   * means the file is in their Downloads tray by the time the composer
   * tab focuses. Skipped if the user already hit "Download image". */
  function openComposer(url: string) {
    if (!downloaded()) downloadPng();
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
        <img class="share-fallback-preview" src={imgUrl} alt="Share card preview" />
        <div class="share-fallback-text">{props.text}</div>
        <div class="share-fallback-actions">
          <button type="button" onClick={downloadPng}>
            {downloaded() ? "Downloaded ✓" : "Download image"}
          </button>
          <button type="button" onClick={() => openComposer(xUrl)}>Open X</button>
          <button type="button" onClick={() => openComposer(fbUrl)}>Open Facebook</button>
          <button type="button" onClick={copyLink}>{copyLabel()}</button>
        </div>
        <div class="share-fallback-hint">
          Open X or Facebook also downloads the image — drag it into the
          composer when it opens. (Composers can't auto-attach files.)
        </div>
      </div>
    </div>
  );
}
