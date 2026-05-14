/**
 * ShareFrame — render-time wrapper for shareable Cards.
 *
 * Vertical stack:
 *   1. Entity-ID header (logo + name + context) — sits ABOVE the card.
 *   2. Card-bordered body (`.card` chrome — tarot border, corner-numeral
 *      slots) containing the actual Card content.
 *   3. Scoracle attribution footer (mark + URL + timestamp) — sits BELOW
 *      the card.
 *
 * The chrome lives on the body div via the shared `.card` class so the
 * corner Roman numerals land at the body's top-left + bottom-right —
 * the same convention as in-app cards. The frame as a whole has no
 * chrome of its own; identification + attribution are plain bands.
 *
 * Two locked rules per ~/scoracleWiki/wiki/Architecture/Share Frame.md:
 *   1. Only Cards get framed — never Shells, never Tabs.
 *   2. Attribution lives in the Frame, never in the Card.
 *
 * Implementation note: rendered inside `<ShareButton>`'s modal preview
 * area. The same DOM tree the user sees in the preview is what
 * `html-to-image` captures at download time — no separate off-screen
 * mount.
 */

import { Show, type JSX } from "solid-js";
import "./ShareFrame.css";

export interface ShareFrameProps {
  /** Entity image — team crest for teams, headshot for players. */
  entityImageUrl: string;
  /** Entity name — Tan Nimbus / Georgia, prominent. */
  entityName: string;
  /** Context line — e.g., "Golden State · NBA" for players, "Premier League" for teams. */
  entityContext: string;
  /** Type of card being shared — appears in the footer ("vibe", "stats", etc.). */
  cardType: string;
  /** Canonical URL of the entity page on scoracle.com. */
  canonicalUrl: string;
  /** ISO timestamp the card data was generated. Rendered as a date in the footer. */
  computedAt?: string;
  /**
   * Corner-slot label (Shell-level chrome). When set, ShareFrame renders
   * the value at the top-left + bottom-right corners of the card-bordered
   * body — mirroring the in-app `.card > .shell-corner-num` convention so
   * the share artifact preserves the card's corner chrome (e.g.,
   * VibeCard's archetype Roman numeral).
   */
  cornerLabel?: string;
  /** The Card to frame — pixel-identical to its in-app render. */
  children: JSX.Element;
  /** Ref callback for the frame root — what consumers pass to html-to-image. */
  ref?: (el: HTMLDivElement) => void;
}

function formatShareDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function urlForFooter(canonical: string): string {
  // Strip protocol + trailing slash for cleaner display in the footer.
  return canonical.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function ShareFrame(props: ShareFrameProps) {
  return (
    <div class="share-frame" ref={props.ref}>
      <header class="share-frame-header">
        <img
          class="share-frame-entity-img"
          src={props.entityImageUrl}
          alt=""
          crossorigin="anonymous"
        />
        <div class="share-frame-entity-text">
          <div class="share-frame-entity-name">{props.entityName}</div>
          <div class="share-frame-entity-context">{props.entityContext}</div>
        </div>
      </header>

      <div class="share-frame-body card">
        <Show when={props.cornerLabel}>
          <span class="shell-corner-num shell-corner-num-tl" aria-hidden="true">{props.cornerLabel}</span>
          <span class="shell-corner-num shell-corner-num-br" aria-hidden="true">{props.cornerLabel}</span>
        </Show>
        <div class="share-frame-card-area">{props.children}</div>
      </div>

      <footer class="share-frame-footer">
        <span class="share-frame-mark" aria-hidden="true">◉</span>
        <span class="share-frame-url">{urlForFooter(props.canonicalUrl)}</span>
        <span class="share-frame-meta">
          {formatShareDate(props.computedAt)}
          {props.computedAt ? " · " : ""}
          {props.cardType}
        </span>
      </footer>
    </div>
  );
}
