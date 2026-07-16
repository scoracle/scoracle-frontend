/**
 * Slate — the navigation pillar: the Marker and the Conditions.
 *
 * The page-level selection object for product surfaces (profile cards,
 * leaderboard sports): a tab rail with one traveling ink point beside the
 * active item, and an optional conditions row — the scoped controls set as a
 * single line of type. Wears the tray well. Replaces the retired
 * NavRail/NavRailStack pair (2026-07-16).
 *
 * Tabs = products: they change the story being told. Conditions = scopes:
 * they change the lens on the same story, and stay honest Selects/Disclosures
 * underneath — the Slate owns only their line-of-type presentation. Compare
 * rides the conditions line as a button that opens CompareSearch.
 *
 * The marker needs client-side measurement (label offsets), so SSR paints a
 * static point on the active tab (CSS fallback in Slate.css) and the
 * floating, animating marker takes over once mounted and measured. Pure
 * presentational otherwise; consumers own active state and data binding.
 * Pillar primitive — extract-ready for shared web UI.
 */

import { For, Show, createEffect, createSignal, on, onCleanup, onMount, type JSX } from "solid-js";
import "./Slate.css";

export interface SlateItem<T extends string> {
  id: T;
  label: string;
}

interface SlateProps<T extends string> {
  items: ReadonlyArray<SlateItem<T>>;
  active: T;
  onSelect: (id: T) => void;
  /** Accessible label for the tablist. */
  ariaLabel?: string;
  /** The conditions row — scoped Select/Disclosure controls, set as one line. */
  conditions?: JSX.Element;
  /** Accessible group label for the conditions row. */
  conditionsAriaLabel?: string;
}

/** Gap between the marker's right edge and the active label's left edge.
    Mirrored by the pre-measure CSS fallback (15px = 6px point + this). */
const MARKER_GAP = 9;

export default function Slate<T extends string>(props: SlateProps<T>) {
  let railEl: HTMLDivElement | undefined;
  let markerEl: HTMLSpanElement | undefined;
  const [measured, setMeasured] = createSignal(false);

  const place = () => {
    if (!railEl || !markerEl) return;
    const active = railEl.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!active) return;
    markerEl.style.setProperty(
      "--slate-mx",
      `${active.offsetLeft - markerEl.offsetWidth - MARKER_GAP}px`,
    );
    setMeasured(true);
  };

  onMount(() => {
    place();
    // Fraunces swaps in after hydration and changes label metrics.
    document.fonts?.ready.then(place).catch(() => {});
    window.addEventListener("resize", place);
    onCleanup(() => window.removeEventListener("resize", place));
  });

  // Re-place after the DOM applies a new active tab (or a new item set —
  // entity-type and sport changes swap the labels under the marker).
  createEffect(on(
    () => [props.active, props.items] as const,
    () => requestAnimationFrame(place),
    { defer: true },
  ));

  return (
    <div class="slate">
      <div class="slate-scroll">
        <div
          class="slate-rail"
          classList={{ "is-measured": measured() }}
          role="tablist"
          aria-label={props.ariaLabel}
          ref={railEl}
        >
          <span class="slate-marker" aria-hidden="true" ref={markerEl} />
          <For each={props.items}>
            {(item) => (
              <button
                type="button"
                class="slate-tab"
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
          class="slate-conds"
          role="group"
          aria-label={props.conditionsAriaLabel ?? "View conditions"}
        >
          {props.conditions}
        </div>
      </Show>
    </div>
  );
}
