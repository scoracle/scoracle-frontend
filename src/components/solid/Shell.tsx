/**
 * Shell — the brand silhouette primitive.
 *
 * Every "shell" surface across the platform (profile MetaShell,
 * TabShell, ContentShell, home SportTabShell, SearchCard, future
 * sandbox/fantasy/stats cards, ShareFrame's outbound artifact) renders
 * the same tarot-card chrome: bone surface, weathered inset stroke,
 * paper-on-desk shadow, slightly rounded outer. Shell owns that chrome
 * so every consumer is one component, not five hand-rolled wrappers.
 *
 * Corner slot — card-driven. Cards inside a Shell publish what should
 * sit in the top-left + bottom-right corner numerals by calling
 * `useShell()?.setCornerLabel(value)` in a createEffect. Examples:
 *
 *   - EntityMeta publishes the entity ID
 *   - VibeCard publishes the active archetype's Roman numeral
 *
 * When no card publishes a label, Shell falls back to the neutral
 * accent-circle dots (handled in global.css via
 * `.shell:not(.has-corner-label)::after`). The DOM stays mounted either
 * way so tab flips don't blink chrome.
 *
 * Last write wins. Tabs that mount one at a time (the profile-page
 * sticky-mount setup) naturally serialize publishes; cards that
 * publish on a transient state still clear their label on cleanup so
 * the Shell falls back to dots when they unmount.
 */

import {
  createSignal,
  createContext,
  useContext,
  Show,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";

interface ShellContextValue {
  /**
   * Publish the corner-slot label. Pass undefined (or "") to release
   * the label and fall back to the accent-circle dots. Calls from
   * createEffect should pair with onCleanup that resets to undefined
   * so the slot doesn't keep stale content after the card unmounts.
   */
  setCornerLabel: (label: string | undefined) => void;
}

const ShellContext = createContext<ShellContextValue>();

export function useShell(): ShellContextValue | undefined {
  return useContext(ShellContext);
}

interface ShellProps {
  /** Host element. Defaults to <div>. Use "nav" for navigation
   *  shells (TabShell, SportTabShell), "section" for content
   *  regions, etc. */
  as?: "div" | "section" | "nav" | "main" | "aside";
  "aria-label"?: string;
  /** Layout / sizing overrides. Shell owns chrome — callers own
   *  layout. Keep padding, max-width, content alignment here. */
  class?: string;
  classList?: Record<string, boolean | undefined>;
  children: JSX.Element;
}

export default function Shell(props: ShellProps) {
  const [label, setLabel] = createSignal<string | undefined>(undefined);
  const hasLabel = () => {
    const l = label();
    return l != null && l !== "";
  };

  return (
    <ShellContext.Provider value={{ setCornerLabel: setLabel }}>
      <Dynamic
        component={props.as ?? "div"}
        class={`shell card${props.class ? ` ${props.class}` : ""}`}
        classList={{
          ...(props.classList ?? {}),
          "has-corner-label": hasLabel(),
        }}
        aria-label={props["aria-label"]}
      >
        <Show when={label()}>
          {(l) => (
            <>
              <span class="shell-corner-num shell-corner-num-tl" aria-hidden="true">{l()}</span>
              <span class="shell-corner-num shell-corner-num-br" aria-hidden="true">{l()}</span>
            </>
          )}
        </Show>
        {props.children}
      </Dynamic>
    </ShellContext.Provider>
  );
}
