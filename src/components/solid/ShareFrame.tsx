/**
 * ShareFrame — render-time wrapper for shareable Cards.
 *
 * Header (entity image + name + context) + Card area (children — the actual
 * Card render, pixel-identical to in-app) + footer (Scoracle mark + URL +
 * timestamp). Resolves the v2 *card format = brand identity* / *designed to
 * be screenshotted and shared* tension: the Card itself stays minimal in the
 * running app, identification + attribution are earned only at share-time.
 *
 * v0 ships at 4:5 aspect (portrait — the natural fit for VibeCard). Other
 * variants (1:1 square, 9:16 story, 16:9 landscape) come in Phase 4b along
 * with the OG image route.
 *
 * Two locked rules per ~/scoracleWiki/wiki/Architecture/Share Frame.md:
 *   1. Only Cards get framed — never Shells, never Tabs.
 *   2. Attribution lives in the Frame, never in the Card.
 *
 * Implementation note: this component is rendered off-screen at share-time
 * (via Portal in the consuming Card), captured via html-to-image, and
 * unmounted. It's not a runtime UI element on the live page.
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
   * the value in its top-left + bottom-right corners — mirroring the in-app
   * ContentShell convention so the share artifact preserves the card's
   * corner chrome (e.g., VibeCard's archetype Roman numeral). The Card
   * itself stays minimal; chrome lives at the frame/Shell level. Locked
   * 2026-05-10 with the v2 chrome lift.
   */
  cornerLabel?: string;
  /** The Card to frame — pixel-identical to its in-app render. */
  children: JSX.Element;
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
    <div class="share-frame">
      <Show when={props.cornerLabel}>
        <span class="shell-corner-num shell-corner-num-tl" aria-hidden="true">{props.cornerLabel}</span>
        <span class="shell-corner-num shell-corner-num-br" aria-hidden="true">{props.cornerLabel}</span>
      </Show>
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

      <div class="share-frame-card-area">{props.children}</div>

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
