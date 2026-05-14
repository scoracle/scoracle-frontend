/**
 * ShareModal — internal modal primitive for `<ShareButton>`.
 *
 * Portal-mounted dialog with three regions: close affordance, scrollable
 * preview area (where the framed card JSX renders at natural size), and
 * an action row (X, Facebook, Copy link, Download image). All four
 * actions are user-initiated link clicks or button taps so popup
 * blockers don't intercept the social-share intents.
 *
 * Closes on backdrop click, Escape key, or the close button. Focus
 * returns to whatever was focused before open (the share button, in
 * the canonical consumer).
 *
 * Not exported from any barrel — locked behind ShareButton so future
 * API tweaks don't churn every consumer.
 */

import { Show, For, createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import "./ShareModal.css";

export interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  /** Live JSX shown in the preview area — typically a `<ShareFrame>`
   *  wrapping the card body. Captured by html-to-image at download. */
  children: JSX.Element;
  /** Absolute canonical URL the share intents point at. */
  canonicalUrl: string;
  /** Suggested post text for X and the "copied" toast. */
  shareText: string;
  /** Invoked when the user taps "Download image". */
  onDownload: () => void | Promise<void>;
  /** Ref attached to the preview wrapper so the download handler can
   *  pass it to html-to-image without ShareModal owning the capture
   *  pipeline. */
  previewRef?: (el: HTMLDivElement) => void;
}

const X_INTENT = "https://x.com/intent/post";
const FB_INTENT = "https://www.facebook.com/sharer/sharer.php";

export default function ShareModal(props: ShareModalProps) {
  const [copied, setCopied] = createSignal(false);
  const [downloading, setDownloading] = createSignal(false);
  let copiedTimer: number | undefined;
  let prevFocus: HTMLElement | null = null;
  let dialogRef: HTMLDivElement | undefined;

  const xUrl = () =>
    `${X_INTENT}?text=${encodeURIComponent(props.shareText)}&url=${encodeURIComponent(props.canonicalUrl)}`;
  const fbUrl = () =>
    `${FB_INTENT}?u=${encodeURIComponent(props.canonicalUrl)}`;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  }

  // Open/close lifecycle: focus management + global keydown.
  createEffect(() => {
    if (!props.open) return;
    prevFocus = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    document.addEventListener("keydown", handleKeydown);
    queueMicrotask(() => {
      const target = dialogRef?.querySelector<HTMLElement>("[data-autofocus]");
      target?.focus();
    });
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeydown);
      // Restore focus to whatever the user had focused before open.
      prevFocus?.focus?.();
    });
  });

  onCleanup(() => {
    if (copiedTimer !== undefined) {
      clearTimeout(copiedTimer);
    }
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(props.canonicalUrl);
      setCopied(true);
      if (copiedTimer !== undefined) clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail under restrictive permissions; quietly
      // skip the toast — the user can still use the other actions.
    }
  }

  async function handleDownload() {
    if (downloading()) return;
    setDownloading(true);
    try {
      await props.onDownload();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="share-modal-backdrop"
          role="presentation"
          onClick={props.onClose}
        >
          <div
            ref={dialogRef}
            class="share-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Share this card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              class="share-modal-close"
              aria-label="Close share dialog"
              onClick={props.onClose}
              data-autofocus
            >
              ×
            </button>

            <div class="share-modal-preview-scroll">
              <div class="share-modal-preview" ref={props.previewRef}>
                {props.children}
              </div>
            </div>

            <For
              each={[
                {
                  key: "x",
                  label: "Share on X",
                  href: xUrl,
                },
                {
                  key: "facebook",
                  label: "Share on Facebook",
                  href: fbUrl,
                },
              ]}
            >
              {(action) => (
                <a
                  class="share-modal-action share-modal-action-link"
                  href={action.href()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {action.label}
                </a>
              )}
            </For>

            <button
              type="button"
              class="share-modal-action"
              onClick={() => void handleCopy()}
            >
              {copied() ? "Copied" : "Copy link"}
            </button>

            <button
              type="button"
              class="share-modal-action"
              classList={{ "is-busy": downloading() }}
              onClick={() => void handleDownload()}
              disabled={downloading()}
            >
              {downloading() ? "Preparing…" : "Download image"}
            </button>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
