/**
 * Shell — the platform's vessel primitive.
 *
 * Frame to the Card's picture. Owns chrome (tarot border, surface,
 * shadow, corner-label slot, accent-dot fallback) AND, when `share`
 * is supplied, the entire share apparatus (button, modal, preview
 * frame, snapshot pipeline, X/Facebook/Copy/Download actions).
 * Set-and-forget.
 *
 * One canonical shape: 380×320 landscape, aspect ratio preserved as
 * the viewport shrinks. Surfaces whose content can't fit (the
 * profile-nav strip, list cards, the home-page search strip) opt out
 * via the boolean `unlockHeight` prop.
 *
 * Corner-label resolution (in priority order):
 *   1. `props.cornerLabel` — static prop, the canonical pattern for
 *      new cards.
 *   2. `useShell()?.setCornerLabel(value)` published from a child —
 *      preserved for EntityMeta's existing publish pattern.
 *   3. None — Shell renders accent-circle dots via the
 *      `.shell:not(.has-corner-label)::after` CSS fallback in
 *      global.css.
 *
 * Share contract: when `props.share` is set, Shell mounts an internal
 * `<ShareButton>` (private to this module) which handles modal state,
 * X/Facebook intent URLs, clipboard copy, and html-to-image
 * download. The modal preview wraps a fresh inner `<Shell>` (no
 * `share`) inside `<ShareFrame>` so the artifact silhouette is
 * byte-identical to the in-app card.
 *
 * Cards never touch ShareButton / ShareModal / ShareFrame / html-to-image.
 */

import {
  createSignal,
  createContext,
  useContext,
  Show,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  buildShareUrl,
  type ShareEntity,
  type ShareTab,
} from "../../lib/utils/share-url";
import ShareButton from "./ShareButton";
import ShareFrame from "./ShareFrame";

// ─── Corner-label context ───────────────────────────────────────────────────

interface ShellContextValue {
  setCornerLabel: (label: string | undefined) => void;
}

const ShellContext = createContext<ShellContextValue>();

export function useShell(): ShellContextValue | undefined {
  return useContext(ShellContext);
}

// ─── Public types ───────────────────────────────────────────────────────────

export interface ShellShareEntityMeta {
  imageUrl: string;
  context: string;
}

export interface ShellShareSecondaryEntityMeta extends ShellShareEntityMeta {
  name: string;
}

export interface ShellShareMeta {
  /** Card-type label baked into download filename + share-frame footer. */
  cardType: string;
  /** {sport, type, id} — canonical URL + filename slug. */
  entity: ShareEntity;
  /** Optional deep-link target on the canonical URL. */
  tab?: ShareTab;
  /** Entity name — filename slug + share-frame header. */
  name: string;
  /** Suggested X composer text. */
  text: string;
  /** Primary entity facts for the frame header (img + context). */
  primary: ShellShareEntityMeta;
  /** Optional secondary entity for Compare's dual-meta header. */
  secondary?: ShellShareSecondaryEntityMeta;
  /** ISO timestamp the underlying data was generated (rendered in footer). */
  computedAt?: string;
}

interface ShellProps {
  /** Host element. Defaults to <div>. */
  as?: "div" | "section" | "nav" | "main" | "aside" | "article";
  "aria-label"?: string;
  /** Layout / sizing overrides — Shell owns chrome, callers own
   *  layout (padding, max-width overrides for unlocked Shells,
   *  content alignment). */
  class?: string;
  classList?: Record<string, boolean | undefined>;
  children: JSX.Element;

  /** Opt out of the locked 380×320 shape — height becomes content-
   *  driven and the caller's class owns width. Use for surfaces that
   *  can't fit a locked card (nav strips, list cards, search shells). */
  unlockHeight?: boolean;
  /** Static-prop alternative to `useShell()?.setCornerLabel(...)`.
   *  Takes priority when both are set. */
  cornerLabel?: string;
  /** Ref forwarded to the Shell's root DOM element — useful for
   *  external measurement / focus / snapshot. */
  ref?: (el: HTMLElement) => void;

  /** When supplied, Shell renders a share button + modal +
   *  share-frame composition. Cards opt in to sharing by providing
   *  this single grouped prop. */
  share?: ShellShareMeta;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Shell(props: ShellProps) {
  const [publishedLabel, setPublishedLabel] = createSignal<string | undefined>(undefined);

  // Effective label = prop wins over context publish.
  const effectiveLabel = () => props.cornerLabel ?? publishedLabel();
  const hasLabel = () => {
    const l = effectiveLabel();
    return l != null && l !== "";
  };

  return (
    <ShellContext.Provider value={{ setCornerLabel: setPublishedLabel }}>
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
        <Show when={effectiveLabel()}>
          {(l) => (
            <>
              <span class="shell-corner-num shell-corner-num-tl" aria-hidden="true">{l()}</span>
              <span class="shell-corner-num shell-corner-num-br" aria-hidden="true">{l()}</span>
            </>
          )}
        </Show>

        <Show when={props.share}>
          {(share) => (
            <ShareButton
              entity={share().entity}
              tab={share().tab}
              cardType={share().cardType}
              entityName={share().name}
              shareText={share().text}
              preview={() => (
                <ShareFrame
                  entityName={share().name}
                  entityImageUrl={share().primary.imageUrl}
                  entityContext={share().primary.context}
                  secondaryEntity={share().secondary}
                  cardType={share().cardType}
                  canonicalUrl={buildShareUrl(share().entity, share().tab)}
                  computedAt={share().computedAt}
                >
                  {/* Inner Shell carries the chrome (border, surface,
                     corner numerals) — ShareFrame is just the band
                     wrapper around it. No `share` prop here, so this
                     inner Shell renders body-only. */}
                  <Shell cornerLabel={props.cornerLabel}>
                    {props.children}
                  </Shell>
                </ShareFrame>
              )}
            />
          )}
        </Show>

        {props.children}
      </Dynamic>
    </ShellContext.Provider>
  );
}
