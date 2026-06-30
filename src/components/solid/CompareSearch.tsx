/**
 * CompareSearch — Inline compare search bar for the Stats view.
 *
 * Renders a search input + suggestion list scoped to same-sport, same-type
 * entities (excluding the primary). On select, calls `onSelect(entity)`.
 * When something is selected, renders a small "vs <name> ×" pill instead
 * of the input. Clearing emits `onSelect(null)`.
 */

import {
  createSignal, createMemo, createEffect, batch,
  Show, For,
} from 'solid-js';
import { entityDataStore } from '../../lib/utils/entity-data-store';
import { searchEntities } from '../../lib/utils/entity-search';
import type { AutocompleteEntity, EntityType } from '../../lib/types';
import './CompareSearch.css';

const MAX_SUGGESTIONS = 8;
const MIN_QUERY_LENGTH = 2;

interface CompareSearchProps {
  sport: string;
  entityType: EntityType;
  /** Optional id to omit from suggestions. When unset, the entity can
   *  be compared with itself (useful for season-vs-prior-season views). */
  excludeId?: string;
  /** Currently selected comparison entity (null = none). */
  selected: AutocompleteEntity | null;
  /** Called with the picked entity, or null when cleared. */
  onSelect: (entity: AutocompleteEntity | null) => void;
}

export default function CompareSearch(props: CompareSearchProps) {
  const [candidates, setCandidates] = createSignal<AutocompleteEntity[]>([]);
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [open, setOpen] = createSignal(false);
  let inputRef!: HTMLInputElement;

  // Effect runs once at setup with initial prop values, and again whenever
  // sport/type/excludeId change. Covers initial load too — no separate onMount.
  createEffect(() => {
    const sport = props.sport;
    const type = props.entityType;
    const exclude = props.excludeId;
    entityDataStore.getEntities(sport).then(list => {
      setCandidates(
        list.filter(e => e.type === type && (!exclude || e.id !== exclude)),
      );
    }).catch(() => {});
  });

  const suggestions = createMemo(() => {
    return searchEntities(candidates(), query(), {
      limit: MAX_SUGGESTIONS,
      minQueryLength: MIN_QUERY_LENGTH,
    });
  });

  function handleInput() {
    const value = inputRef.value;
    setQuery(value);
    setSelectedIndex(-1);
    setOpen(value.length >= MIN_QUERY_LENGTH);
  }

  function handleFocus() {
    if (query().length >= MIN_QUERY_LENGTH) setOpen(true);
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      setSelectedIndex(-1);
    }, 200);
  }

  function pickEntity(entity: AutocompleteEntity) {
    batch(() => {
      props.onSelect(entity);
      setQuery('');
      setOpen(false);
      setSelectedIndex(-1);
    });
    if (inputRef) inputRef.value = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    const sugs = suggestions();
    if (e.key === 'Escape') { setOpen(false); inputRef.blur(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sugs.length > 0) setSelectedIndex(prev => Math.min(prev + 1, sugs.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sugs.length > 0) setSelectedIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = selectedIndex();
      if (idx >= 0 && sugs[idx]) pickEntity(sugs[idx]);
      else if (sugs.length > 0) pickEntity(sugs[0]);
    }
  }

  return (
    <div class="compare-search-row">
      <Show when={!props.selected} fallback={
        <div class="compare-pill">
          <span class="compare-pill-label">vs</span>
          <span class="compare-pill-name">{props.selected!.name}</span>
          <button
            type="button"
            class="compare-pill-clear"
            aria-label="Clear comparison"
            onClick={() => props.onSelect(null)}
          >
            ×
          </button>
        </div>
      }>
        <div class="compare-search">
          <input
            ref={inputRef}
            type="text"
            class="compare-search-input"
            placeholder={`Compare with another ${props.entityType}…`}
            autocomplete="off"
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeydown}
          />
          <Show when={open()}>
            <div class="compare-suggestions">
              <Show when={suggestions().length > 0} fallback={
                <div class="compare-no-results">No results</div>
              }>
                <For each={suggestions()}>
                  {(entity, i) => (
                    <button
                      type="button"
                      class="compare-suggestion"
                      classList={{ selected: selectedIndex() === i() }}
                      tabIndex={-1}
                      onMouseDown={() => pickEntity(entity)}
                    >
                      <span class="compare-suggestion-name">{entity.name}</span>
                      <span class="compare-suggestion-meta">
                        {props.entityType === 'player' ? (entity.team || 'Player') : 'Team'}
                      </span>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
