/**
 * CopyCardButton — the copy affordance every profile Card carries, positioned
 * top-right against the wrapping Shell root (`.card` is position: relative).
 *
 * Click → compose this card's body under the entity's trading-card meta
 * (<ShadowCard> — the share artifact, always the canonical portrait
 * silhouette) → crisp 2x PNG on the clipboard. No links, no share sheets,
 * no server rendering.
 *
 * Safari quirk, load-bearing: the ClipboardItem must be constructed
 * SYNCHRONOUSLY inside the click gesture with a pending Promise<Blob> —
 * Safari revokes clipboard permission if the gesture context is lost to an
 * await before `write()` is called. Capture starts after the item is handed
 * to the clipboard.
 *
 * Fallback: when image clipboard is unsupported (or write is refused), the
 * same PNG downloads via a temporary <a download> — the button never dies.
 */
import { Match, Switch, createSignal } from "solid-js";
import { useProfile } from "../../contexts/profile";
import { captureShadowCard } from "./ShadowCard";
import "./CopyCardButton.css";

interface CopyCardButtonProps {
  /** The Shell root whose body feeds the artifact (Card wires its ref through). */
  target: () => HTMLElement | undefined;
  /** Filename stem for the download fallback, e.g. "lebron-james-rating". */
  filename: () => string;
  /** The live card's corner numeral, carried onto the artifact. */
  cornerLabel?: () => string | undefined;
}

type CopyState = "idle" | "busy" | "done";

export default function CopyCardButton(props: CopyCardButtonProps) {
  const ctx = useProfile();
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

    const blobPromise = captureShadowCard(ctx, el, props.cornerLabel?.());
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
    <div class="copy-card-root">
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
