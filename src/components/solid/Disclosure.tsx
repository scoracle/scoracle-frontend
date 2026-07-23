/**
 * Disclosure — the platform's single open/close affordance behavior.
 *
 * Owns the lifecycle every dropdown/popover shares: a trigger button that
 * toggles an absolutely-positioned panel, closing on outside pointer/mouse interaction and
 * `Escape` (listeners registered only while open), with focus returning to the
 * trigger on `Escape`. It renders the `position: relative` anchor + the trigger
 * button (wiring `aria-haspopup` / `aria-expanded` / `aria-controls`) and shows
 * the panel via `<Show>`; consumers supply the trigger and panel *content* via
 * render props and receive a small `api` ({ open, toggle, close, focusTrigger,
 * panelId }). The panel element itself is the consumer's — render your own
 * `<ul role="listbox" id={api.panelId}>` etc. so the DOM/CSS stays yours.
 *
 * This is the shared core behind Select (and the Search / Compare disclosures
 * and LeaderboardMenu). Pillar primitive — no flagship-specific imports,
 * extract-ready for @scoracle/ui. Listbox keyboard navigation (arrow/Enter
 * highlight) is consumer-specific and layered on via `onTriggerKeyDown`.
 */
import {
  createSignal, createEffect, createUniqueId, onCleanup, Show,
  type Accessor, type JSX,
} from "solid-js";
import "./Disclosure.css";

export interface DisclosureApi {
  /** Whether the panel is open. */
  open: Accessor<boolean>;
  /** Flip the open state (the trigger's click handler). */
  toggle: () => void;
  /** Close the panel. */
  close: () => void;
  /** Return focus to the trigger button (for focus-return after a commit). */
  focusTrigger: () => void;
  /** Stable id wired to the trigger's `aria-controls`; put it on your panel. */
  panelId: string;
}

export interface DisclosureProps {
  /** aria-label for the trigger button. */
  ariaLabel?: string;
  /** aria-haspopup kind for the trigger. Default "listbox". */
  haspopup?: JSX.HTMLAttributes<HTMLButtonElement>["aria-haspopup"];
  /** Class on the position:relative anchor. Default "disclosure". */
  class?: string;
  /** Class on the trigger button. */
  triggerClass?: string;
  /** Trigger inner content (value text, chevron, icon…). */
  trigger: (api: DisclosureApi) => JSX.Element;
  /** Panel content, rendered only while open. Render your own panel element. */
  children: (api: DisclosureApi) => JSX.Element;
  /** Optional trigger keydown — for listbox arrow/Enter navigation. */
  onTriggerKeyDown?: (e: KeyboardEvent, api: DisclosureApi) => void;
}

export default function Disclosure(props: DisclosureProps) {
  const [open, setOpen] = createSignal(false);
  const panelId = createUniqueId();

  let triggerRef!: HTMLButtonElement;
  let containerRef!: HTMLDivElement;

  const focusTrigger = () => triggerRef?.focus();
  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);
  const api: DisclosureApi = { open, toggle, close, focusTrigger, panelId };

  // Panels pop UP (Scott, 2026-07-23 — the conditions line rides low on the
  // profile layout). Publish the anchor's viewport headroom as a custom
  // property at open so consumer CSS can cap an upward panel's height where
  // the anchor sits high (leaderboard well) — measurement is behavior; the
  // panel styling stays the consumer's. Effects never run during SSR.
  createEffect(() => {
    if (!open()) return;
    const headroom = Math.max(0, containerRef.getBoundingClientRect().top - 12);
    containerRef.style.setProperty("--disclosure-headroom", `${Math.round(headroom)}px`);
  });

  // Outside-click + Escape, registered only while open so nothing sits on
  // window indefinitely. pointerdown/mousedown (not click) so an option's
  // commit isn't raced by the trigger's blur, and touch gets the same behavior.
  // Escape returns focus to the trigger.
  createEffect(() => {
    if (!open()) return;
    const onDown = (e: PointerEvent | MouseEvent) => {
      if (!containerRef.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        focusTrigger();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    onCleanup(() => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    });
  });

  return (
    <div ref={containerRef} class={props.class ?? "disclosure"}>
      <button
        ref={triggerRef}
        type="button"
        class={props.triggerClass}
        aria-haspopup={props.haspopup ?? "listbox"}
        aria-expanded={open()}
        aria-controls={panelId}
        aria-label={props.ariaLabel}
        onClick={toggle}
        onKeyDown={(e) => props.onTriggerKeyDown?.(e, api)}
      >
        {props.trigger(api)}
      </button>
      <Show when={open()}>{props.children(api)}</Show>
    </div>
  );
}
