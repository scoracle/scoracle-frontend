/**
 * ShareFrame — band wrapper for shareable Cards.
 *
 * Vertical stack:
 *   1. Entity-ID header (logo + name + context) — sits ABOVE the card.
 *      When `secondaryEntity` is set (Compare's dual-meta artifact),
 *      the header flips to a two-column layout with the second entity
 *      right-aligned.
 *   2. Card slot — receives a fresh `<Shell>` (provided by the outer
 *      Shell when constructing the preview) that draws the chrome
 *      and renders the same cardBody the user sees in-app.
 *   3. Scoracle attribution footer (mark + URL + timestamp) — sits BELOW
 *      the card.
 *
 * ShareFrame draws **no chrome of its own** — the slot's Shell does.
 * Identification + attribution are plain bands above + below it. This
 * mirrors the in-app composition (Card → Shell), so the artifact looks
 * identical to what's on the page, just with bands wrapped around it.
 *
 * Two locked rules per ~/scoracleWiki/wiki/Architecture/Share Frame.md:
 *   1. Only Cards get framed — never Shells, never Tabs.
 *   2. Attribution lives in the Frame, never in the Card.
 *
 * Implementation note: rendered inside `<ShareButton>`'s modal preview
 * area. The same DOM tree the user sees in the preview is what
 * `html-to-image` captures at download time — no separate off-screen
 * mount.
 *
 * Private to `Shell.tsx` — no Card imports this directly.
 */

import { Show, type JSX } from "solid-js";
import type { ShellTemplate } from "./Shell";
import "./ShareFrame.css";

export interface ShareFrameSecondaryEntity {
  name: string;
  imageUrl: string;
  context: string;
}

export interface ShareFrameProps {
  /** Sizing template — controls the frame's max-width so the artifact
   *  matches the in-app card silhouette (standard → ~380px, dynamic
   *  → wider for surfaces like Compare with dual-meta header). */
  template: ShellTemplate;
  /** Primary entity image — team crest for teams, headshot for players. */
  entityImageUrl: string;
  /** Primary entity name — Tan Nimbus / Georgia, prominent. */
  entityName: string;
  /** Primary context line — e.g., "Golden State · NBA" for players. */
  entityContext: string;
  /** Optional secondary entity — populated when sharing a Compare
   *  artifact with a comparison selected. Header flips to dual-meta
   *  layout. */
  secondaryEntity?: ShareFrameSecondaryEntity;
  /** Type of card being shared — appears in the footer ("vibe", "stats", etc.). */
  cardType: string;
  /** Canonical URL of the entity page on scoracle.com. */
  canonicalUrl: string;
  /** ISO timestamp the card data was generated. Rendered as a date in the footer. */
  computedAt?: string;
  /** Card content — a fresh `<Shell>` wrapping the same cardBody the
   *  user sees in-app. Provided by the outer Shell, not by Cards. */
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
  return canonical.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function ShareFrame(props: ShareFrameProps) {
  return (
    <div
      class={`share-frame share-frame-${props.template}`}
      classList={{ "share-frame-dual": props.secondaryEntity != null }}
      ref={props.ref}
    >
      <header class="share-frame-header">
        <div class="share-frame-entity share-frame-entity-primary">
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
        </div>
        <Show when={props.secondaryEntity}>
          {(sec) => (
            <>
              <span class="share-frame-vs" aria-hidden="true">vs</span>
              <div class="share-frame-entity share-frame-entity-secondary">
                <img
                  class="share-frame-entity-img"
                  src={sec().imageUrl}
                  alt=""
                  crossorigin="anonymous"
                />
                <div class="share-frame-entity-text">
                  <div class="share-frame-entity-name">{sec().name}</div>
                  <div class="share-frame-entity-context">{sec().context}</div>
                </div>
              </div>
            </>
          )}
        </Show>
      </header>

      <div class="share-frame-card-slot">{props.children}</div>

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
