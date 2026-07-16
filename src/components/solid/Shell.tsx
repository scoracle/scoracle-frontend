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
 *   - Padding: `1.5rem` (24px) uniform on all sides. NEVER overridden
 *     by Cards. This is the uniform-appearance guarantee — drop any
 *     Card's body into Shell and the brand silhouette is right by
 *     construction.
 *   - Chrome: tarot border SVG (`.card::before`), multi-layer
 *     paper-on-desk shadow, target-ID corner-label slots with accent-dot fallback.
 *
 * Cards own: their body content, and the layout (flex/grid/etc.)
 * inside the padded interior. No padding overrides, no aspect escape
 * hatches.
 *
 * Surfaces that aren't card-shaped (selection rails) have their own primitive
 * (NavWell) and don't wrap in Shell.
 *
 * Corner label: pass `cornerLabel` as a static prop. Profile cards pass the
 * target entity id. Omit it and Shell renders the accent-circle dots via the
 * `.shell:not(.has-corner-label)::after` CSS fallback in global.css.
 *
 * Copying is NOT a Shell concern. Profile Cards render `<CopyCardButton>`
 * inside their own body; the button positions itself absolute top-right of
 * the wrapping Shell because `.card` is `position: relative`, and renders
 * the card DOM to a PNG on the clipboard.
 *
 * Pillar primitive — no flagship-specific imports inside; extract-ready
 * for `@scoracle/ui` via a one-step `git mv` when sandbox lands.
 */

import { For, Show, type JSX } from "solid-js";
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

  /** Text rendered in both corner slots (TR + BL rotated). Omit and Shell
   *  renders the accent-circle dots fallback. */
  cornerLabel?: string;
  /** Alternate frame renderer. The default CSS border-image is the live UI
   *  path; SVG is for capture pipelines that cannot embed border-image URLs. */
  frameMode?: "css" | "svg";
  /** Ref forwarded to the Shell's root DOM element — useful for external
   *  measurement / focus / snapshot. */
  ref?: (el: HTMLElement) => void;

  // Design-noted, NOT implemented in this refactor:
  //   size?: "sm" | "md" | "lg"  — sandbox compact / hero placements.
  //   Width flips via `--card-width` on a `.shell-sm` / `.shell-lg` class.
}

// ?v=2 mirrors global.css's border-image URL — one cache-bust version for
// the shared frame asset; bump both together when the SVG changes.
const SHELL_FRAME_ASSET = "/chrome/weathered-tarot-border.svg?v=2";

const SHELL_FRAME_SLICES = [
  ["shell-tarot-frame-tl", "0 0 18 18"],
  ["shell-tarot-frame-top", "18 0 64 18"],
  ["shell-tarot-frame-tr", "82 0 18 18"],
  ["shell-tarot-frame-right", "82 18 18 64"],
  ["shell-tarot-frame-br", "82 82 18 18"],
  ["shell-tarot-frame-bottom", "18 82 64 18"],
  ["shell-tarot-frame-bl", "0 82 18 18"],
  ["shell-tarot-frame-left", "0 18 18 64"],
] as const;

function ShellTarotFrame() {
  return (
    <div class="shell-tarot-frame" aria-hidden="true">
      <For each={SHELL_FRAME_SLICES}>
        {([className, viewBox]) => (
          <svg
            class={`shell-tarot-frame-piece ${className}`}
            viewBox={viewBox}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <image
              href={SHELL_FRAME_ASSET}
              x="0"
              y="0"
              width="100"
              height="100"
              preserveAspectRatio="none"
            />
          </svg>
        )}
      </For>
    </div>
  );
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
        "card-frame-svg": props.frameMode === "svg",
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
      <Show when={props.frameMode === "svg"}>
        <ShellTarotFrame />
      </Show>
      {props.children}
    </Dynamic>
  );
}
