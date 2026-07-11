/**
 * CopyCardButton — the copy affordance every profile Card carries, positioned
 * top-right against the wrapping Shell root (`.card` is position: relative).
 *
 * Click → render the card DOM to a crisp 2x PNG (html-to-image) → put it on
 * the clipboard. The card IS the artifact — chrome, product, and the identity
 * band that is hidden on-page and revealed only in the capture clone, so the
 * paste stands alone. No links, no share sheets, no server rendering.
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
  // The artifact is rendered from an OFF-SCREEN CLONE, not the live card: the
  // identity band is display:none on the page and revealed only here, so the
  // copy self-attributes while the on-screen card stays band-less — with no
  // flash or layout shift during capture.
  const clone = el.cloneNode(true) as HTMLElement;
  const band = clone.querySelector<HTMLElement>(".card-identity-band");
  if (band) band.style.display = "flex";
  // The Shell centers itself with margin-inline auto; zeroed so the clone
  // doesn't shift/crop inside the capture canvas.
  clone.style.margin = "0";

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none;";
  host.style.width = `${el.offsetWidth}px`;
  // The pane's silhouette tokens (--card-width & friends) don't inherit
  // off-screen; carry the resolved values over so the clone keeps its shape.
  const sourceStyle = getComputedStyle(el);
  for (const token of ["--card-width", "--card-aspect-ratio"]) {
    const value = sourceStyle.getPropertyValue(token);
    if (value) host.style.setProperty(token, value);
  }
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const blob = await toBlob(clone, {
      pixelRatio: 2,
      filter: (node: HTMLElement) => !node.classList?.contains(CAPTURE_EXCLUDE_CLASS),
      imagePlaceholder: TRANSPARENT_PIXEL,
    });
    if (!blob) throw new Error("card capture produced no image");
    return blob;
  } finally {
    host.remove();
  }
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
