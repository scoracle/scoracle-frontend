/**
 * ShareButton — the single inline button shareable Cards render.
 *
 * Click behavior, by platform:
 *   - Web Share API supported (mobile + some desktops): fires the OS
 *     share sheet directly. User picks app; image preview auto-fetches
 *     on the receiving platform via the URL's og:image meta tag.
 *   - Web Share unsupported (most desktops): opens a tiny three-button
 *     popover anchored to the share button — "Post to X", "Post to
 *     Facebook", "Copy link". No image preview pane (the OG-only design:
 *     previews live on the receiving platform, not in our app).
 *
 * Brand consistency: positioning is handled here (absolute top-right of
 * the nearest positioned ancestor, which is the wrapping Shell since
 * `.card` is `position: relative`). Shareable Cards just render
 * `<ShareButton url={...} text={...} />` inside their body — no
 * manual positioning, no share-apparatus imports.
 */
import { createSignal, Show, onCleanup, onMount, createEffect } from "solid-js";
import {
  buildXIntentUrl,
  buildFacebookShareUrl,
  canWebShare,
  copyToClipboard,
  tryWebShare,
} from "./intents";
import "./ShareButton.css";

interface ShareButtonProps {
  /** Canonical share URL — the page whose og:image the receiving
   *  platform will auto-fetch. Typically the profile-page URL with the
   *  matching ?tab= deep-link. */
  url: string;
  /** Pre-filled text for the X composer. Falls back to the URL on
   *  platforms that ignore the field. */
  text: string;
  /** Optional aria-label for accessibility (default: "Share this card"). */
  ariaLabel?: string;
}

export default function ShareButton(props: ShareButtonProps) {
  const [popoverOpen, setPopoverOpen] = createSignal(false);
  const [copyState, setCopyState] = createSignal<"idle" | "copied" | "failed">("idle");

  async function handleClick(e: MouseEvent) {
    // On Web-Share-capable platforms (mostly mobile), fire the OS sheet
    // and skip the popover entirely — that's the cleanest UX.
    if (canWebShare()) {
      e.preventDefault();
      const ok = await tryWebShare(props.url, props.text);
      // If Web Share is supported but the actual call failed (rare —
      // permission denied, mid-call platform error), fall through to the
      // popover so the user still has an out.
      if (!ok) setPopoverOpen(true);
      return;
    }
    setPopoverOpen((v) => !v);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(props.url);
    setCopyState(ok ? "copied" : "failed");
    // Reset the label so subsequent opens don't show stale state.
    setTimeout(() => setCopyState("idle"), 1800);
  }

  // Close the popover on outside click / Escape.
  let rootEl: HTMLDivElement | undefined;
  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!popoverOpen()) return;
      if (rootEl && !rootEl.contains(e.target as Node)) setPopoverOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popoverOpen()) setPopoverOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    });
  });

  // Reset "copied" feedback when the popover closes so it doesn't linger.
  createEffect(() => {
    if (!popoverOpen()) setCopyState("idle");
  });

  const copyLabel = () => {
    const s = copyState();
    if (s === "copied") return "Copied!";
    if (s === "failed") return "Copy failed";
    return "Copy link";
  };

  return (
    <div class="share-button-root" ref={(el) => (rootEl = el)}>
      <button
        type="button"
        class="share-button"
        aria-label={props.ariaLabel ?? "Share this card"}
        aria-expanded={popoverOpen()}
        aria-haspopup="menu"
        onClick={handleClick}
      >
        {/* Square-with-arrow share glyph. 18×18 viewBox; stroke inherits
            from `currentColor` so the button color rule controls it. */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
             stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          <path d="M13 6.5 V4 H4 v10 h9 v-2.5" />
          <path d="M9 7 L15 1" />
          <path d="M11 1 H15 V5" />
        </svg>
      </button>

      <Show when={popoverOpen()}>
        <div class="share-popover" role="menu" aria-label="Share options">
          <a
            class="share-popover-item"
            role="menuitem"
            href={buildXIntentUrl(props.url, props.text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPopoverOpen(false)}
          >
            Post to X
          </a>
          <a
            class="share-popover-item"
            role="menuitem"
            href={buildFacebookShareUrl(props.url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPopoverOpen(false)}
          >
            Post to Facebook
          </a>
          <button
            type="button"
            class="share-popover-item share-popover-item-button"
            role="menuitem"
            onClick={handleCopy}
          >
            {copyLabel()}
          </button>
        </div>
      </Show>
    </div>
  );
}
