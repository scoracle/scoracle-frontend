/**
 * NavRail — platform-wide rail primitive for Scoracle selection surfaces.
 *
 * Two render paths, one brand primitive:
 *   - Item rail: tab/segmented navigation for product-level switches such as
 *     profile cards, sport selection, and leaderboard boards.
 *   - Control rail: a centered, wrapping row for scoped controls such as
 *     season, rate, model, compare, and search disclosures.
 *
 * The visual doctrine is shared, but semantics stay honest. Item rails render a
 * `tablist`; mixed control rails render a labelled `group` and let child
 * controls keep their own button/listbox/disclosure roles.
 *
 * Pure presentational. Consumers own active state and data binding.
 * Pillar primitive — extract-ready for shared web UI when that package exists.
 */

import { For, type JSX } from "solid-js";
import "./NavRail.css";

export interface NavRailItem<T extends string> {
  id: T;
  label: string;
}

interface NavRailItemProps<T extends string> {
  items: ReadonlyArray<NavRailItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  children?: never;
  /** Accessible label for the wrapping tablist. */
  ariaLabel?: string;
  /** Drops standalone chrome so multiple item rails can compose in a toolbar. */
  inline?: boolean;
}

interface NavRailControlProps {
  children: JSX.Element;
  items?: never;
  active?: never;
  onSelect?: never;
  /** Accessible group label for the mixed control row. */
  ariaLabel?: string;
  inline?: never;
}

export type NavRailProps<T extends string> = NavRailItemProps<T> | NavRailControlProps;

function isItemRail<T extends string>(props: NavRailProps<T>): props is NavRailItemProps<T> {
  return "items" in props;
}

export default function NavRail<T extends string>(props: NavRailProps<T>) {
  if (!isItemRail(props)) {
    return (
      <div class="nav-rail nav-rail-controls" role="group" aria-label={props.ariaLabel ?? "View controls"}>
        {props.children}
      </div>
    );
  }

  return (
    <div
      class="nav-rail nav-rail-items"
      classList={{ "nav-rail-inline": props.inline }}
      role="tablist"
      aria-label={props.ariaLabel}
    >
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            class="nav-rail-btn"
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
