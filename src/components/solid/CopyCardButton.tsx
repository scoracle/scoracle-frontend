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
 * iOS quirk, also load-bearing: even with the promise-backed item, iOS
 * Safari refuses the write when the capture outlives the tap's activation
 * window. The artifact still resolved — so instead of dumping the user into
 * the download sheet, the button ARMS: it holds the finished blob and the
 * next tap writes it inside its own fresh gesture, instantly. The armed
 * state expires after a few seconds so a stale artifact can't be copied
 * after the card's controls change.
 *
 * Platforms with NO image clipboard API (WKWebView browsers — DuckDuckGo,
 * Chrome iOS, in-app views): the native share sheet with the PNG file is the
 * closest thing to a copy — its Copy action IS the clipboard on iOS — so it
 * outranks download there. Tried as soon as the capture lands (transient
 * activation usually survives a fast capture); if the gesture is spent, the
 * button ARMS and the next tap opens the sheet in-gesture.
 *
 * Fallback of last resort: no clipboard, no share (or both refused) — the
 * same PNG downloads via a temporary <a download>. The button never dies.
 */
import { Match, Switch, createSignal, onCleanup } from "solid-js";
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

type CopyState = "idle" | "busy" | "ready" | "done";

/** How long an armed capture stays valid. Long enough to read the pulse and
 *  tap again; short enough that the artifact can't go stale behind a
 *  season/scope change. */
const ARMED_TTL_MS = 8000;

export default function CopyCardButton(props: CopyCardButtonProps) {
  const ctx = useProfile();
  const [state, setState] = createSignal<CopyState>("idle");

  // The finished artifact held for the armed second tap (iOS path).
  let readyBlob: Blob | null = null;
  let readyTimer: number | undefined;

  // Runs via onCleanup on BOTH sides — SSR disposes the owner after render,
  // where `window` doesn't exist. Bare clearTimeout is a global everywhere.
  const disarm = () => {
    readyBlob = null;
    if (readyTimer !== undefined) clearTimeout(readyTimer);
  };
  onCleanup(disarm);

  const settle = () => {
    setState("done");
    window.setTimeout(() => setState("idle"), 1600);
  };

  const arm = (blob: Blob) => {
    readyBlob = blob;
    setState("ready");
    readyTimer = window.setTimeout(() => {
      disarm();
      setState("idle");
    }, ARMED_TTL_MS);
  };

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.filename()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const supportsImageClipboard = () =>
    typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

  const artifactFile = (blob: Blob) =>
    new File([blob], `${props.filename()}.png`, { type: "image/png" });

  const canShareFile = (file: File) =>
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

  // WKWebView browsers (DuckDuckGo, Chrome iOS, in-app views) hide the image
  // clipboard API entirely. There the native share sheet is the closest thing
  // to a copy — its Copy action IS the clipboard on iOS — so it outranks the
  // download fallback. AbortError = the user closed the sheet on purpose;
  // that's a completed interaction, not a failure to route around.
  const shareOrDownload = (blob: Blob) => {
    const file = artifactFile(blob);
    if (canShareFile(file)) {
      navigator
        .share({ files: [file] })
        .then(settle)
        .catch((err: unknown) => {
          if ((err as DOMException | null)?.name === "AbortError") {
            setState("idle");
            return;
          }
          download(blob);
          settle();
        });
      return;
    }
    download(blob);
    settle();
  };

  // Deliver an in-hand blob within the CURRENT gesture: clipboard when the
  // platform exposes it, else share sheet, else download.
  const deliver = (blob: Blob) => {
    if (supportsImageClipboard()) {
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blob })])
        .then(settle)
        .catch(() => shareOrDownload(blob));
      return;
    }
    shareOrDownload(blob);
  };

  function handleClick() {
    const el = props.target();
    if (!el || state() === "busy") return;

    // Armed second tap: the artifact is already in hand, so delivery happens
    // inside THIS gesture with nothing pending — nothing for iOS to time out
    // on.
    if (state() === "ready" && readyBlob) {
      const blob = readyBlob;
      disarm();
      deliver(blob);
      return;
    }

    setState("busy");

    const blobPromise = captureShadowCard(ctx, el, props.cornerLabel?.());

    if (supportsImageClipboard()) {
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blobPromise })])
        .then(settle)
        .catch(() =>
          // Refused write — typically iOS expiring the tap's activation while
          // the capture ran. The user asked for a copy, so ARM the finished
          // blob for a one-tap in-gesture retry instead of downloading.
          blobPromise.then(arm).catch(() => setState("idle")),
        );
      return;
    }

    // No clipboard API at all (WKWebView browsers). Try the share sheet as
    // soon as the capture lands — transient activation usually survives a
    // fast capture. If the browser says the gesture is spent (or share isn't
    // available either), ARM so the next tap delivers in-gesture.
    blobPromise
      .then((blob) => {
        const file = artifactFile(blob);
        if (!canShareFile(file)) {
          arm(blob);
          return;
        }
        navigator
          .share({ files: [file] })
          .then(settle)
          .catch((err: unknown) => {
            if ((err as DOMException | null)?.name === "AbortError") {
              setState("idle");
              return;
            }
            arm(blob);
          });
      })
      .catch(() => setState("idle"));
  }

  return (
    <div class="copy-card-root">
      <button
        type="button"
        class="copy-card-button"
        classList={{
          "copy-card-done": state() === "done",
          "copy-card-ready": state() === "ready",
        }}
        aria-label={
          state() === "ready" ? "Image ready — tap again to copy" : "Copy card as image"
        }
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
