/**
 * ScopeSelect — dropdown for the rating scope (cohort re-rank). Same dropdown
 * aesthetic as SeasonSelect (reuses its CSS); the convention is that all scope
 * pickers are dropdowns in the ContentShell scope row. Generic {value,label}
 * options (SeasonSelect is number-only), used for All / By Position / By
 * Conference / By Division / By League.
 */
import { createEffect, createSignal, createUniqueId, For, onCleanup, Show } from "solid-js";
import "./SeasonSelect.css";

export interface ScopeOption {
  value: string;
  label: string;
}

export interface ScopeSelectProps {
  options: readonly ScopeOption[];
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}

export default function ScopeSelect(props: ScopeSelectProps) {
  const resolved = () =>
    props.options.find((o) => o.value === props.value) ?? props.options[0] ?? null;
  const [open, setOpen] = createSignal(false);
  const [highlightIdx, setHighlightIdx] = createSignal<number>(-1);
  const listboxId = createUniqueId();

  let triggerRef!: HTMLButtonElement;
  let containerRef!: HTMLDivElement;

  function openDropdown() {
    const idx = props.options.findIndex((o) => o.value === resolved()?.value);
    setHighlightIdx(idx >= 0 ? idx : 0);
    setOpen(true);
  }
  function closeDropdown() {
    setOpen(false);
    setHighlightIdx(-1);
  }
  function commit(value: string) {
    if (value !== resolved()?.value) props.onChange(value);
    closeDropdown();
    triggerRef?.focus();
  }
  function onTriggerClick() {
    if (open()) closeDropdown();
    else openDropdown();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (!open()) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(props.options.length - 1, (i < 0 ? -1 : i) + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, (i < 0 ? props.options.length : i) - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightIdx();
      if (idx >= 0) commit(props.options[idx].value);
    }
  }

  createEffect(() => {
    if (!open()) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.contains(e.target as Node)) closeDropdown();
    };
    window.addEventListener("mousedown", handler);
    onCleanup(() => window.removeEventListener("mousedown", handler));
  });

  return (
    <div ref={containerRef} class="season-select">
      <button
        ref={triggerRef}
        type="button"
        class="season-select-trigger"
        aria-label={props.ariaLabel ?? "Scope"}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-controls={listboxId}
        onClick={onTriggerClick}
        onKeyDown={onKeyDown}
      >
        <span class="season-select-value">{resolved()?.label ?? "—"}</span>
        <span class="season-select-chevron" aria-hidden="true" />
      </button>
      <Show when={open()}>
        <ul
          id={listboxId}
          class="season-select-dropdown"
          role="listbox"
          aria-label={props.ariaLabel ?? "Scope"}
        >
          <For each={props.options}>
            {(o, i) => (
              <li
                role="option"
                class="season-select-option"
                classList={{
                  selected: o.value === resolved()?.value,
                  highlighted: i() === highlightIdx(),
                }}
                aria-selected={o.value === resolved()?.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(o.value);
                }}
                onMouseEnter={() => setHighlightIdx(i())}
              >
                {o.label}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
