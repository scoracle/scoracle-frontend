/**
 * Shell — the platform's vessel primitive.
 *
 * Frame to the Card's picture. Owns chrome only: tarot border (via
 * `.card::before`), surface, paper-on-desk shadow, corner-label slot
 * (with accent-dot fallback when no label is supplied), and uniform
 * internal padding. Set-and-forget — drop a Card's body into `<Shell>`
 * and the brand silhouette is right by construction.
 *
 * One canonical shape: 600×348 (real tarot card aspect 19:11 flipped
 * landscape). `aspect-ratio` is preferred, not strictly capped — content
 * that exceeds the slot grows the box (the locked Card should be
 * redesigned to fit). Surfaces whose content can't fit a locked card
 * (the profile-nav strip, list cards, the home-page search shell)
 * opt out via the boolean `unlockHeight` prop — width never unlocks.
 *
 * Corner label: pass `cornerLabel` as a static prop. Examples:
 * `EntityMeta` passes the entity id; `VibeCard` passes the archetype
 * Roman numeral. Omit it and Shell renders the accent-circle dots via
 * the `.shell:not(.has-corner-label)::after` CSS fallback in global.css.
 *
 * Share is NOT a Shell concern. Shareable Cards render `<ShareButton>`
 * (from `src/lib/share`) inside their own body; the button positions
 * itself absolute top-right of the wrapping Shell because `.card` is
 * `position: relative`. The artifact that social platforms preview is
 * server-rendered at the canonical URL's `<meta og:image>` route (see
 * `src/routes/og/...`) — no client-side rasterization, no Shell-side
 * share apparatus.
 *
 * Pillar primitive — no flagship-specific imports inside; extract-ready
 * for `@scoracle/ui` via a one-step `git mv` when sandbox lands.
 */

import { Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

interface ShellProps {
  /** Host element. Defaults to <div>. */
  as?: "div" | "section" | "nav" | "main" | "aside" | "article";
  "aria-label"?: string;
  /** Layout / sizing overrides — Shell owns chrome, callers own layout
   *  (max-width overrides for unlocked Shells, content alignment, etc.). */
  class?: string;
  classList?: Record<string, boolean | undefined>;
  children: JSX.Element;

  /** Opt out of the locked 19:11 aspect — height becomes content-driven
   *  and the caller's class owns max-height if needed. Use for surfaces
   *  that can't fit a locked card (nav strips, list cards, search shells).
   *  Width never unlocks. */
  unlockHeight?: boolean;
  /** Text rendered in both corner slots (TL + BR rotated). Omit and Shell
   *  renders the accent-circle dots fallback. */
  cornerLabel?: string;
  /** Ref forwarded to the Shell's root DOM element — useful for external
   *  measurement / focus / snapshot. */
  ref?: (el: HTMLElement) => void;
}

export default function Shell(props: ShellProps) {
  const hasLabel = () => {
    const l = props.cornerLabel;
    return l != null && l !== "";
  };

  return (
    <Dynamic
      component={props.as ?? "div"}
      ref={props.ref}
      class={`shell card${props.unlockHeight ? " shell-unlocked" : ""}${props.class ? ` ${props.class}` : ""}`}
      classList={{
        ...(props.classList ?? {}),
        "has-corner-label": hasLabel(),
      }}
      aria-label={props["aria-label"]}
    >
      <Show when={props.cornerLabel}>
        {(l) => (
          <>
            <span class="shell-corner-num shell-corner-num-tl" aria-hidden="true">{l()}</span>
            <span class="shell-corner-num shell-corner-num-br" aria-hidden="true">{l()}</span>
          </>
        )}
      </Show>
      {props.children}
    </Dynamic>
  );
}
