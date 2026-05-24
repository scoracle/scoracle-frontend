/**
 * SeasonSelect — custom dropdown for picking the displayed season.
 *
 * Shared by StatsCard (own row under the toolbar) and CompareCard (per-
 * entity pair in the header). Options come from the entity's
 * `meta.available_seasons` — the backend guarantees every entry resolves
 * to a populated stats payload for this entity in the current league
 * scope, so the picker never offers a dead season.
 *
 * Why not a native <select>? It worked for the data-layer concerns but
 * the OS-rendered dropdown (system font, system highlight color) read
 * as foreign next to the rest of the deck. This control mirrors the
 * SearchBar suggestion list's aesthetic — opaque card surface, 1px
 * tarot border, hairline row separators, hover/keyboard highlight —
 * so it sits in the same visual family as the existing dropdowns.
 *
 * Keyboard: Space / Enter / Down open the dropdown when the trigger has
 * focus; arrows navigate; Enter commits; Escape closes. Click-outside
 * closes via a window mousedown listener that's only registered while
 * the dropdown is open.
 */
import { createEffect, createSignal, createUniqueId, For, onCleanup, Show } from "solid-js";
import "./SeasonSelect.css";

export interface SeasonSelectProps {
  /** Available seasons in newest-first order (from `meta.available_seasons`). */
  seasons: readonly number[];
  /** Currently selected season — must appear in `seasons` to render as
   *  the active option. Null falls through to the newest. */
  value: number | null;
  onChange: (next: number) => void;
  ariaLabel?: string;
}

export default function SeasonSelect(props: SeasonSelectProps) {
  const resolved = () => props.value ?? props.seasons[0] ?? null;
  const [open, setOpen] = createSignal(false);
  const [highlightIdx, setHighlightIdx] = createSignal<number>(-1);
  const listboxId = createUniqueId();

  let triggerRef!: HTMLButtonElement;
  let containerRef!: HTMLDivElement;

  function openDropdown() {
    const idx = props.seasons.findIndex((s) => s === resolved());
    setHighlightIdx(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setHighlightIdx(-1);
  }

  function commit(season: number) {
    if (season !== resolved()) props.onChange(season);
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
      setHighlightIdx((i) =>
        Math.min(props.seasons.length - 1, (i < 0 ? -1 : i) + 1),
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) =>
        Math.max(0, (i < 0 ? props.seasons.length : i) - 1),
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightIdx();
      if (idx >= 0) commit(props.seasons[idx]);
    }
  }

  // Close on outside click. Only registered while open so the listener
  // doesn't sit on window indefinitely.
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
        aria-label={props.ariaLabel ?? "Season"}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-controls={listboxId}
        onClick={onTriggerClick}
        onKeyDown={onKeyDown}
      >
        <span class="season-select-value">{resolved() ?? "—"}</span>
        <span class="season-select-chevron" aria-hidden="true" />
      </button>
      <Show when={open()}>
        <ul
          id={listboxId}
          class="season-select-dropdown"
          role="listbox"
          aria-label={props.ariaLabel ?? "Season"}
        >
          <For each={props.seasons}>
            {(s, i) => (
              <li
                role="option"
                class="season-select-option"
                classList={{
                  selected: s === resolved(),
                  highlighted: i() === highlightIdx(),
                }}
                aria-selected={s === resolved()}
                onMouseDown={(e) => {
                  // Stop the trigger's blur from racing the click — the
                  // option commits via this mousedown directly.
                  e.preventDefault();
                  commit(s);
                }}
                onMouseEnter={() => setHighlightIdx(i())}
              >
                {s}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
