/**
 * NavStrip — platform-wide thin nav primitive (Solid.js)
 *
 * Two roles, one component:
 *   - Standalone (default): a full-width strip with its own bottom
 *     hairline. Used for primary navigation: profile tabs (News /
 *     Vibes / ...), home page sport row, any future site's top nav.
 *   - Inline (`inline` prop): drops the strip-level chrome (width cap,
 *     margin, padding, bottom hairline) so multiple NavStrips can
 *     compose into a single toolbar. The PARENT toolbar element draws
 *     the shared bottom hairline. Used for secondary controls like
 *     StatsCard's Per-Game / Per-90 + scope toggles.
 *
 * Pure presentational. The consumer owns the data binding (nanostore,
 * ProfileContext, local signal — whatever fits) and passes the active
 * id + `onSelect` callback.
 *
 * Visual: display-font italic labels (Georgia italic — the same family
 * voice already used on SigilCard's score and EntityMeta's name).
 * Inactive labels in `var(--text-secondary)`; active label in
 * `var(--text)` plus a 2px underline aligned to the strip's bottom
 * hairline. No background fill anywhere — no SaaS pill chrome.
 *
 * Generic over a string-id type so consumers get type-safe ids without
 * casting (e.g., `NavStrip<ProfileTab>` keeps the union narrow at the
 * call site).
 *
 * Standalone width aligns with the content-card column below via
 * `max-width: var(--card-width)`. Inline mode hands width to the parent
 * toolbar.
 *
 * Pillar primitive — extract-ready for `@scoracle/ui` when sandbox lands.
 */

import { For } from 'solid-js';
import './NavStrip.css';

export interface NavStripItem<T extends string> {
  id: T;
  label: string;
}

interface NavStripProps<T extends string> {
  items: ReadonlyArray<NavStripItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  /** aria-label for the wrapping nav landmark. */
  ariaLabel?: string;
  /** Inline mode: drops the strip's standalone chrome (width cap,
   *  vertical padding, bottom hairline) so it composes into a parent
   *  toolbar. The parent provides those things; the active-label
   *  underline still positions itself to align with the toolbar's
   *  bottom hairline assuming the toolbar uses the same `padding:
   *  0.75rem 0` as a standalone NavStrip. */
  inline?: boolean;
}

export default function NavStrip<T extends string>(props: NavStripProps<T>) {
  return (
    <div
      class="nav-strip"
      classList={{ "nav-strip-inline": props.inline }}
      role="tablist"
      aria-label={props.ariaLabel}
    >
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            class="nav-strip-btn"
            classList={{ active: props.active === item.id }}
            aria-pressed={props.active === item.id}
            role="tab"
            onClick={() => props.onSelect(item.id)}
          >
            {item.label}
          </button>
        )}
      </For>
    </div>
  );
}
