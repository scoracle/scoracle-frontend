/**
 * NavTabs — platform-wide tab-strip primitive (Solid.js)
 *
 * One look, everywhere. Used on the profile page (Articles / X /
 * Vibes / Stats / Traits / Compare), the home page (sport row), and
 * any future site that needs a nav strip.
 *
 * Pure presentational. The consumer owns the data binding (nanostore,
 * ProfileContext, local signal — whatever fits) and passes the active
 * id + `onSelect` callback. NavTabs renders the row and the dark-fill
 * active state that the brand established.
 *
 * Generic over a string-id type so consumers get type-safe ids without
 * casting (e.g., `NavTabs<ProfileTab>` keeps the union narrow at the
 * call site).
 *
 * Pillar primitive — extract-ready for `@scoracle/ui` when sandbox lands.
 */

import { For } from 'solid-js';
import './NavTabs.css';

export interface NavTabsItem<T extends string> {
  id: T;
  label: string;
}

interface NavTabsProps<T extends string> {
  items: ReadonlyArray<NavTabsItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  /** aria-label for the wrapping nav landmark. */
  ariaLabel?: string;
}

export default function NavTabs<T extends string>(props: NavTabsProps<T>) {
  return (
    <div
      class="nav-tabs"
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
