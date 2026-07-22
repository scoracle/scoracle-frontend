/**
 * NavWell — the navigation pillar: the Marker and the Conditions.
 *
 * The page-level selection object for product surfaces (profile cards,
 * leaderboard sports): a tab rail with one traveling ink point beside the
 * active item, and an optional conditions row — the scoped controls set as a
 * single line of type. Wears the tray well. Replaces the retired
 * NavRail/NavRailStack pair (2026-07-16).
 *
 * Tabs = products: they change the story being told. Conditions = scopes:
 * they change the lens on the same story, and stay honest Selects/Disclosures
 * underneath — the NavWell owns only their line-of-type presentation. Compare
 * rides the conditions line as a button that opens CompareSearch.
 *
 * The marker needs client-side measurement (label offsets), so SSR paints a
 * static point on the active tab (CSS fallback in NavWell.css) and the
 * floating, animating marker takes over once mounted and measured. Pure
 * presentational otherwise; consumers own active state and data binding.
 * Pillar primitive — extract-ready for shared web UI.
 */

import { For, Show, createEffect, createSignal, on, onCleanup, onMount, type JSX } from "solid-js";
import "./NavWell.css";

export interface NavWellItem<T extends string> {
  id: T;
  label: string;
}

interface NavWellProps<T extends string> {
  items: ReadonlyArray<NavWellItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  /** Accessible label for the tablist. */
  ariaLabel?: string;
  /** The conditions row — scoped Select/Disclosure controls, set as one line. */
  conditions?: JSX.Element;
  /** Accessible group label for the conditions row. */
  conditionsAriaLabel?: string;
}


export default function NavWell<T extends string>(props: NavWellProps<T>) {
  let railEl: HTMLDivElement | undefined;
  let markerEl: HTMLSpanElement | undefined;
  let scrollEl: HTMLDivElement | undefined;
  const [measured, setMeasured] = createSignal(false);
  const [clipStart, setClipStart] = createSignal(false);
  const [clipEnd, setClipEnd] = createSignal(false);

  // The rail scrolls sideways on narrow viewports; the fade affordance
  // (NavWell.css) should appear only on an edge where caps actually
  // continue out of view.
  const syncEdges = () => {
    if (!scrollEl) return;
    setClipStart(scrollEl.scrollLeft > 1);
    setClipEnd(scrollEl.scrollLeft + scrollEl.clientWidth < scrollEl.scrollWidth - 1);
  };

  const place = () => {
    if (!railEl || !markerEl) return;
    const active = railEl.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!active) return;
    // Centered ABOVE the active label (2026-07-16 revision — the beside-the-
    // label seat cost the rail 24px gutters; vertical space is free in the
    // tray). The pre-measure CSS fallback mirrors this position.
    markerEl.style.setProperty(
      "--nav-well-mx",
      `${active.offsetLeft + (active.offsetWidth - markerEl.offsetWidth) / 2}px`,
    );
    setMeasured(true);
    // Deep links can land on a tab past the scroll viewport's edge — bring
    // it fully into view so the marker isn't riding an invisible label.
    if (scrollEl) {
      const a = active.getBoundingClientRect();
      const s = scrollEl.getBoundingClientRect();
      if (a.left < s.left) scrollEl.scrollLeft += a.left - s.left;
      else if (a.right > s.right) scrollEl.scrollLeft += a.right - s.right;
    }
    syncEdges();
  };

  onMount(() => {
    place();
    // Fraunces swaps in after hydration and changes label metrics.
    document.fonts?.ready.then(place).catch(() => {});
    window.addEventListener("resize", place);
    scrollEl?.addEventListener("scroll", syncEdges, { passive: true });
    onCleanup(() => {
      window.removeEventListener("resize", place);
      scrollEl?.removeEventListener("scroll", syncEdges);
    });
  });

  // Re-place after the DOM applies a new active tab (or a new item set —
  // entity-type and sport changes swap the labels under the marker).
  createEffect(on(
    () => [props.active, props.items] as const,
    () => requestAnimationFrame(place),
    { defer: true },
  ));

  return (
    <div class="nav-well">
      <div
        class="nav-well-scroll"
        classList={{ "is-clipped-start": clipStart(), "is-clipped-end": clipEnd() }}
        ref={scrollEl}
      >
        <div
          class="nav-well-rail"
          classList={{ "is-measured": measured() }}
          role="tablist"
          aria-label={props.ariaLabel}
          ref={railEl}
        >
          <span class="nav-well-marker" aria-hidden="true" ref={markerEl} />
          <For each={props.items}>
            {(item) => (
              <button
                type="button"
                class="nav-well-tab"
                role="tab"
                aria-selected={props.active === item.id}
                onClick={() => props.onSelect(item.id)}
              >
                {item.label}
              </button>
            )}
          </For>
        </div>
      </div>
      <Show when={props.conditions}>
        <div
          class="nav-well-conds"
          role="group"
          aria-label={props.conditionsAriaLabel ?? "View conditions"}
        >
          {props.conditions}
        </div>
      </Show>
    </div>
  );
}
