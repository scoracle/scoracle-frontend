import type { JSX } from "solid-js";
import { For, Show, createEffect, createSignal, onMount, onCleanup } from "solid-js";
import "./NavWell.css";
export interface NavWellItem<T extends string> {
    id: T;
    label: string;
}
interface NavWellProps<T extends string> {
    items: ReadonlyArray<NavWellItem<T>>;
    active: T;
    onSelect: (id: T) => void;
    ariaLabel?: string;
    conditions?: JSX.Element;
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
        if (!scrollEl)
            return;
        setClipStart(scrollEl.scrollLeft > 1);
        setClipEnd(scrollEl.scrollLeft + scrollEl.clientWidth < scrollEl.scrollWidth - 1);
    };
    const place = () => {
        if (!railEl?.isConnected || !markerEl)
            return;
        const active = railEl.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!active)
            return;
        // Centered ABOVE the active label (2026-07-16 revision — the beside-the-
        // label seat cost the rail 24px gutters; vertical space is free in the
        // tray). The pre-measure CSS fallback mirrors this position.
        markerEl.style.setProperty("--nav-well-mx", `${active.offsetLeft + (active.offsetWidth - markerEl.offsetWidth) / 2}px`);
        setMeasured(true);
        // Deep links can land on a tab past the scroll viewport's edge — bring
        // it fully into view so the marker isn't riding an invisible label.
        if (scrollEl) {
            const a = active.getBoundingClientRect();
            const s = scrollEl.getBoundingClientRect();
            if (a.left < s.left)
                scrollEl.scrollLeft += a.left - s.left;
            else if (a.right > s.right)
                scrollEl.scrollLeft += a.right - s.right;
        }
        syncEdges();
    };
    onMount(() => {
        place();
        // Fraunces swaps in after hydration and changes label metrics.
        document.fonts?.ready.then(place).catch(() => { });
        window.addEventListener("resize", place);
        scrollEl?.addEventListener("scroll", syncEdges, { passive: true });
        onCleanup(() => {
            window.removeEventListener("resize", place);
            scrollEl?.removeEventListener("scroll", syncEdges);
        });
    });
    createEffect(() => {
        props.active; props.items;
        const frame = requestAnimationFrame(place);
        onCleanup(() => cancelAnimationFrame(frame));
    });
    return (<div class="nav-well">
      <div ref={scrollEl} class="nav-well-scroll" classList={{ "is-clipped-start": clipStart(), "is-clipped-end": clipEnd() }}>
        <div role="tablist" aria-label={props.ariaLabel} ref={railEl} class="nav-well-rail" classList={{ "is-measured": measured() }}>
          <span class="nav-well-marker" aria-hidden="true" ref={markerEl}/>
          <For each={props.items}>
            {(item) => (<button type="button" class="nav-well-tab" role="tab" aria-selected={props.active === item.id ? "true" : "false"} onClick={() => props.onSelect(item.id)}>
                {item.label}
              </button>)}
          </For>
        </div>
      </div>
      <Show when={props.conditionsAriaLabel || "conditions" in props}>
        <div class="nav-well-conds" role="group" aria-label={props.conditionsAriaLabel ?? "View conditions"}>
          {props.conditions}
        </div>
      </Show>
    </div>);
}
