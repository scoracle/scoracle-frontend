/**
 * Select — the platform's single option-picker dropdown. Unifies the former
 * ScopeSelect (generic {value,label}) and SeasonSelect (number-only): one
 * control, string-valued, used for season / scope / per-X and any future
 * option list. Callers with non-string values (seasons) map to string options
 * at the boundary.
 *
 * Built on <Disclosure> (open/close, outside-click, Escape, focus-return); this
 * component adds only the listbox: arrow/Enter keyboard navigation, the
 * highlighted option, and the option list markup. Visual language matches the
 * SearchBar suggestion list (opaque card, tarot border, hairline rows) so every
 * dropdown reads as one family. Pillar primitive — extract-ready, no
 * flagship-specific imports.
 */
import { createSignal, For } from "solid-js";
import Disclosure, { type DisclosureApi } from "./Disclosure";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: readonly SelectOption[];
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
  /** Shown on the trigger when no option resolves. Default "—". */
  placeholder?: string;
}

export default function Select(props: SelectProps) {
  const resolved = () =>
    props.options.find((o) => o.value === props.value) ?? props.options[0] ?? null;
  const [highlightIdx, setHighlightIdx] = createSignal<number>(-1);

  function commit(value: string, api: DisclosureApi) {
    if (value !== resolved()?.value) props.onChange(value);
    api.close();
    api.focusTrigger();
  }

  function onTriggerKeyDown(e: KeyboardEvent, api: DisclosureApi) {
    if (!api.open()) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const idx = props.options.findIndex((o) => o.value === resolved()?.value);
        setHighlightIdx(idx >= 0 ? idx : 0);
        api.toggle();
      }
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
      if (idx >= 0) commit(props.options[idx].value, api);
    }
  }

  return (
    <Disclosure
      class="select"
      triggerClass="select-trigger"
      ariaLabel={props.ariaLabel ?? "Select"}
      haspopup="listbox"
      onTriggerKeyDown={onTriggerKeyDown}
      trigger={() => (
        <>
          <span class="select-value">{resolved()?.label ?? props.placeholder ?? "—"}</span>
          <span class="select-chevron" aria-hidden="true" />
        </>
      )}
    >
      {(api) => (
        <ul
          id={api.panelId}
          class="select-dropdown"
          role="listbox"
          aria-label={props.ariaLabel ?? "Select"}
        >
          <For each={props.options}>
            {(o, i) => (
              <li
                role="option"
                class="select-option"
                classList={{
                  selected: o.value === resolved()?.value,
                  highlighted: i() === highlightIdx(),
                }}
                aria-selected={o.value === resolved()?.value}
                onMouseDown={(e) => {
                  // Commit on mousedown so the trigger's blur doesn't race it.
                  e.preventDefault();
                  commit(o.value, api);
                }}
                onMouseEnter={() => setHighlightIdx(i())}
              >
                {o.label}
              </li>
            )}
          </For>
        </ul>
      )}
    </Disclosure>
  );
}
