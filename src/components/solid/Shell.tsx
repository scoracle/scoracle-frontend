/**
 * Shell — the platform's vessel primitive.
 *
 * Frame to the Card's picture. Owns chrome AND silhouette by contract;
 * Cards own only their content.
 *
 * Shell owns:
 *   - Width: capped at `var(--card-width)` (600px default; future
 *     `sm`/`lg` variants flip the CSS variable on a modifier class).
 *   - Aspect silhouette: `aspect-ratio: 19/11` as a preference. Content
 *     shorter than 348px sits at the top of a canonical-silhouette
 *     surface; content taller grows naturally to fit.
 *   - Padding: `1.25rem 1.5rem` (20px vertical, 24px horizontal).
 *     NEVER overridden by Cards. This is the uniform-appearance
 *     guarantee — drop any Card's body into Shell and the brand
 *     silhouette is right by construction.
 *   - Chrome: tarot border SVG (`.card::before`), multi-layer
 *     paper-on-desk shadow, corner-label slot with accent-dot fallback.
 *
 * Cards own: their body content, and the layout (flex/grid/etc.)
 * inside the padded interior. No padding overrides, no aspect escape
 * hatches.
 *
 * Surfaces that aren't card-shaped (nav strips) have their own primitive
 * (NavStrip) and don't wrap in Shell.
 *
 * Corner label: pass `cornerLabel` as a static prop. Examples:
 * `EntityMeta` passes the entity id; `VibeCard` passes the archetype
 * Roman numeral. Omit it and Shell renders the accent-circle dots via
 * the `.shell:not(.has-corner-label)::after` CSS fallback in global.css.
 *
 * Share is NOT a Shell concern. Shareable Cards render `<ShareTrigger>`
 * (from `src/lib/share`) inside their own body; the trigger positions
 * itself absolute top-right of the wrapping Shell because `.card` is
 * `position: relative`. On click, ShareTrigger fetches the server-
 * rendered tarot PNG from `/og/...` and hands it to the Web Share API
 * with the post copy + URL pre-filled — the image attaches directly
 * to the post, no platform-crawler scrape required.
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
  /** Card-side hooks: content layout, in-body class scoping. NOT for
   *  overriding Shell's padding, aspect, or width — those are locked. */
  class?: string;
  classList?: Record<string, boolean | undefined>;
  children: JSX.Element;

  /** Text rendered in both corner slots (TL + BR rotated). Omit and Shell
   *  renders the accent-circle dots fallback. */
  cornerLabel?: string;
  /** Ref forwarded to the Shell's root DOM element — useful for external
   *  measurement / focus / snapshot. */
  ref?: (el: HTMLElement) => void;

  // Design-noted, NOT implemented in this refactor:
  //   size?: "sm" | "md" | "lg"  — sandbox compact / hero placements.
  //   Width flips via `--card-width` on a `.shell-sm` / `.shell-lg` class.
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
      class={`shell card${props.class ? ` ${props.class}` : ""}`}
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
