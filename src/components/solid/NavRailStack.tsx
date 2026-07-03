/**
 * NavRailStack — page-level composition for the common Scoracle rail pattern:
 * one item rail followed by an optional scoped-control rail.
 *
 * This is deliberately thinner than NavRail. NavRail owns the primitive; this
 * wrapper only keeps profile and leaderboard from spelling the same two-row
 * structure by hand.
 */

import { Show, type JSX } from "solid-js";
import NavRail, { type NavRailItem } from "./NavRail";
import "./NavRailStack.css";

interface NavRailStackProps<T extends string> {
  items: ReadonlyArray<NavRailItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  ariaLabel?: string;
  controls?: JSX.Element;
  controlsAriaLabel?: string;
}

export default function NavRailStack<T extends string>(props: NavRailStackProps<T>) {
  return (
    <div class="nav-rail-stack">
      <NavRail
        items={props.items}
        active={props.active}
        onSelect={props.onSelect}
        ariaLabel={props.ariaLabel}
      />
      <Show when={props.controls}>
        {(controls) => (
          <NavRail ariaLabel={props.controlsAriaLabel ?? "View controls"}>
            {controls()}
          </NavRail>
        )}
      </Show>
    </div>
  );
}
