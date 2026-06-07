import type { JSX } from "solid-js";
import "./ScopeStrip.css";

/**
 * ScopeStrip — the centered, wrapping strip of view controls that sits below the
 * NavStrip (and on the leaderboard toolbar). A thin layout primitive in the
 * NavStrip mould: it owns only the row's arrangement (centered flex, wraps on
 * narrow viewports), NOT what the controls are or when they show. The consumer
 * composes the controls in (<Select> for season/scope/per-X, Disclosure-based
 * search/compare) and gates visibility per surface — so the primitive stays
 * flagship-free and reusable across pages/sites. Pillar primitive: no
 * flagship-specific imports, extract-ready for @scoracle/ui.
 *
 * Wrap the whole strip in a `<Show>` when a surface may have no controls (e.g.
 * Vibes) so the row collapses cleanly.
 */
export interface ScopeStripProps {
  /** The control elements to arrange. */
  children: JSX.Element;
  /** Accessible group label for the control row. */
  ariaLabel?: string;
}

export default function ScopeStrip(props: ScopeStripProps) {
  return (
    <div class="scope-strip" role="group" aria-label={props.ariaLabel ?? "View controls"}>
      {props.children}
    </div>
  );
}
