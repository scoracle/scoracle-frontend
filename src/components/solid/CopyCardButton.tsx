/**
 * CopyCardButton — the copy affordance every profile Card carries, positioned
 * top-right against the wrapping Shell root (`.card` is position: relative).
 *
 * Click → render the card DOM to a crisp 2x PNG (html-to-image) → put it on
 * the clipboard. The card IS the artifact: identity band, chrome, product —
 * what you see is what you copy, paste it anywhere. No links, no share
 * sheets, no server rendering.
 *
 * Safari quirk, load-bearing: the ClipboardItem must be constructed
 * SYNCHRONOUSLY inside the click gesture with a pending Promise<Blob> —
 * Safari revokes clipboard permission if the gesture context is lost to an
 * await before `write()` is called. Capture starts after the item is handed
 * to the clipboard.
 *
 * Fallback: when image clipboard is unsupported (or write is refused), the
 * same PNG downloads via a temporary <a download> — the button never dies.
 *
 * The button excludes itself from the capture via the html-to-image filter
 * (`.copy-card-exclude`).
 */
import { Match, Switch, createSignal } from "solid-js";
import { toBlob } from "html-to-image";
import "./CopyCardButton.css";

interface CopyCardButtonProps {
  /** The Shell root to capture (Card wires its Shell ref through). */
  target: () => HTMLElement | undefined;
  /** Filename stem for the download fallback, e.g. "lebron-james-rating". */
  filename: () => string;
}

type CopyState = "idle" | "busy" | "done";

const CAPTURE_EXCLUDE_CLASS = "copy-card-exclude";

// 1x1 transparent PNG. Third-party avatar hosts (provider CDNs) without CORS
// headers fail html-to-image's inline fetch; this placeholder keeps the rest
// of the capture whole instead of failing it.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function captureCard(el: HTMLElement): Promise<Blob> {
  const blob = await toBlob(el, {
    pixelRatio: 2,
    // The Shell centers itself with margin-inline auto; the clone inherits it
    // as a fixed computed margin and shifts/crops inside the capture canvas.
    style: { margin: "0" },
    filter: (node: HTMLElement) => !node.classList?.contains(CAPTURE_EXCLUDE_CLASS),
    imagePlaceholder: TRANSPARENT_PIXEL,
  });
  if (!blob) throw new Error("card capture produced no image");
  return blob;
}

export default function CopyCardButton(props: CopyCardButtonProps) {
  const [state, setState] = createSignal<CopyState>("idle");

  const settle = () => {
    setState("done");
    window.setTimeout(() => setState("idle"), 1600);
  };

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.filename()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  function handleClick() {
    const el = props.target();
    if (!el || state() === "busy") return;
    setState("busy");

    const blobPromise = captureCard(el);
    const supportsImageClipboard =
      typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

    if (supportsImageClipboard) {
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blobPromise })])
        .then(settle)
        .catch(() =>
          // Refused write (permissions, platform limits) → same artifact,
          // downloaded instead.
          blobPromise.then(download).then(settle).catch(() => setState("idle")),
        );
      return;
    }

    blobPromise.then(download).then(settle).catch(() => setState("idle"));
  }

  return (
    <div class={`copy-card-root ${CAPTURE_EXCLUDE_CLASS}`}>
      <button
        type="button"
        class="copy-card-button"
        classList={{ "copy-card-done": state() === "done" }}
        aria-label="Copy card as image"
        aria-live="polite"
        disabled={state() === "busy"}
        onClick={handleClick}
      >
        <Switch>
          <Match when={state() === "done"}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3.5 9.5 L7.25 13.25 L14.5 5" />
            </svg>
          </Match>
          <Match when={true}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="6.25" y="6.25" width="8" height="9.5" rx="1.2" />
              <path d="M11.75 3.75 H5.05 A1.3 1.3 0 0 0 3.75 5.05 V13.25" />
            </svg>
          </Match>
        </Switch>
      </button>
    </div>
  );
}
