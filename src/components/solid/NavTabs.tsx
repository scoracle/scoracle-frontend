/**
 * NavTabs — platform-wide tab-strip primitive (Solid.js)
 *
 * One component, three known placements:
 *
 *   - `primary`  full-width split-fill (profile-page parent: News / Stats)
 *   - `feature`  gapped + bounded, larger label (home-page sport row)
 *   - `sub`      gapped + smaller (in-card child nav)
 *
 * Pure presentational. The consumer owns the data binding (nanostore,
 * ProfileContext, local signal — whatever fits) and passes the active id +
 * `onSelect` callback. NavTabs renders the row and the dark-fill active
 * state that the brand established.
 *
 * Generic over a string-id type so consumers get type-safe ids without
 * casting (e.g., `NavTabs<NewsSubTab>` keeps the union narrow at the
 * call site).
 *
 * Pillar primitive — extract-ready for `@scoracle/ui` when sandbox lands.
 */

import { For } from 'solid-js';
import './NavTabs.css';

export type NavTabsVariant = 'primary' | 'feature' | 'sub';

export interface NavTabsItem<T extends string> {
  id: T;
  label: string;
}

interface NavTabsProps<T extends string> {
  items: ReadonlyArray<NavTabsItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  variant: NavTabsVariant;
  /** aria-label for the wrapping nav landmark. */
  ariaLabel?: string;
}

export default function NavTabs<T extends string>(props: NavTabsProps<T>) {
  return (
    <div
      class="nav-tabs"
      classList={{
        [`nav-tabs-${props.variant}`]: true,
      }}
      role="tablist"
      aria-label={props.ariaLabel}
    >
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            class="nav-tabs-btn"
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
