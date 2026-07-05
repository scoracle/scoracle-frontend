/**
 * CompareSearch — Inline compare search bar for the Stats view.
 *
 * Renders a search input + suggestion list scoped to same-sport, same-type
 * entities (excluding the primary). On select, calls `onSelect(entity)`.
 * When something is selected, renders a small "vs <name> ×" pill instead
 * of the input. Clearing emits `onSelect(null)`.
 */

import {
  createSignal, createEffect,
  Show,
} from 'solid-js';
import { entityDataStore } from '../../lib/utils/entity-data-store';
import type { AutocompleteEntity, EntityType } from '../../lib/types';
import SearchBar from './SearchBar';
import './CompareSearch.css';

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
          <SearchBar
            variant="compact"
            entities={candidates()}
            placeholder={`Compare with another ${props.entityType}…`}
            maxSuggestions={8}
            autoFocus
            onPick={props.onSelect}
          />
        </div>
      </Show>
    </div>
  );
}
