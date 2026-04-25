/**
 * SearchBar — Shared autocomplete search component (Solid.js)
 *
 * Fully reactive Solid component used on both the home page (inside
 * CrystalBall) and the header (profile/404 pages). Suggestions,
 * keyboard navigation, and placeholder cycling are all signal-driven.
 *
 * Placeholder reads "{synonym} {sport} players or teams..." — the
 * synonym advances whenever the sport changes (synchronized with the
 * CrystalBall carousel on the home page, static on the profile page).
 *
 * Subscribes to $currentSport nanostore so sport changes propagate
 * automatically.
 */

import {
  createSignal, createMemo, createEffect, on,
  onMount, batch, Show, For,
} from 'solid-js';
import { useStore } from '@nanostores/solid';
import { entityDataStore } from '../../lib/utils/entity-data-store';
import { getSportDisplay, type AutocompleteEntity } from '../../lib/types';
import { normalizeForSearch } from '../../lib/utils/search-normalize';
import { $currentSport } from '../../stores/sport';
import './SearchBar.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Called when user interacts with the search (focus, input) */
  onInteraction?: () => void;
  /** Auto-focus the input on mount (home page) */
  autoFocus?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_SUGGESTIONS = 10;
const MIN_QUERY_LENGTH = 2;

/**
 * Tokenized fuzzy match — every query token must appear as a prefix
 * of some name token. "dak pre" matches "Dak Prescott", "step cur"
 * matches "Stephen Curry". Diacritic-insensitive so "este wil"
 * matches "Estêvão Willian".
 */
function fuzzyMatch(text: string, queryTokens: string[]): boolean {
  const textTokens = normalizeForSearch(text).split(/\s+/);
  return queryTokens.every(qt =>
    textTokens.some(tt => tt.startsWith(qt)),
  );
}

const SEARCH_SYNONYMS = [
  'Peruse', 'Explore', 'Inspect', 'Browse',
  'Discover', 'Find', 'Look up', 'Seek', 'Scan',
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SearchBar(props: SearchBarProps) {
  const sport = useStore($currentSport);

  // Synonym index initializes to 0 for SSR-safe rendering; randomized
  // on mount so server and client render identical HTML, then the
  // client picks a random starting synonym after hydration.
  const [synonymIndex, setSynonymIndex] = createSignal(0);
  const [query, setQuery] = createSignal('');
  const [allData, setAllData] = createSignal<AutocompleteEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [open, setOpen] = createSignal(false);

  let inputRef!: HTMLInputElement;
  let dropdownRef!: HTMLDivElement;

  // ── Derived state ──────────────────────────────────────────────────────

  const placeholder = createMemo(() => {
    const synonym = SEARCH_SYNONYMS[synonymIndex() % SEARCH_SYNONYMS.length];
    const display = getSportDisplay(sport());
    return `${synonym} ${display} players or teams...`;
  });

  const suggestions = createMemo(() => {
    const q = normalizeForSearch(query());
    if (q.length < MIN_QUERY_LENGTH) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return allData()
      .filter(item => {
        // Teams match against name + aliases + search_tokens (covers city
        // names like "detroit" → Pistons). Players stay name-only — their
        // aliases carry team/league metadata that would spam results
        // ("chelsea" would list every Chelsea player).
        const haystack = item.type === 'team'
          ? (item._searchIndex ?? normalizeForSearch(item.name))
          : normalizeForSearch(item.name);
        if (haystack.includes(q)) return true;
        if (tokens.length > 1 && fuzzyMatch(item.name, tokens)) return true;
        return false;
      })
      .slice(0, MAX_SUGGESTIONS);
  });

  // ── Effects ────────────────────────────────────────────────────────────

  // Load entity data whenever sport changes (including initial)
  createEffect(on(sport, (s) => {
    const target = s;
    entityDataStore.getEntities(target).then(data => {
      if (sport() === target) setAllData(data);
    }).catch(() => {});
  }));

  // On sport change (not initial): clear search state, advance synonym
  createEffect(on(sport, (_s, prev) => {
    if (prev !== undefined) {
      batch(() => {
        setQuery('');
        setSelectedIndex(-1);
        setOpen(false);
      });
      if (inputRef) inputRef.value = '';
      setSynonymIndex(i => i + 1);
    }
  }));

  // Scroll selected suggestion into view
  createEffect(() => {
    const idx = selectedIndex();
    if (idx >= 0 && dropdownRef) {
      dropdownRef.querySelectorAll('.search-suggestion-item')[idx]
        ?.scrollIntoView({ block: 'nearest' });
    }
  });

  // ── Handlers ───────────────────────────────────────────────────────────

  function selectEntity(entity: AutocompleteEntity) {
    const sportParam = (entity.sport || sport()).toUpperCase();
    window.location.href = `/profile?sport=${sportParam}&type=${entity.type}&id=${entity.id}`;
  }

  function handleInput() {
    const value = inputRef.value;
    setQuery(value);
    setSelectedIndex(-1);
    setOpen(value.length >= MIN_QUERY_LENGTH);
    props.onInteraction?.();
  }

  function handleFocus() {
    if (query().length >= MIN_QUERY_LENGTH) setOpen(true);
    props.onInteraction?.();
  }

  function handleBlur() {
    // Delay so clicks on suggestions register before dropdown unmounts
    setTimeout(() => {
      setOpen(false);
      setSelectedIndex(-1);
    }, 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    const sugs = suggestions();

    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sugs.length > 0) {
        setSelectedIndex(prev => Math.min(prev + 1, sugs.length - 1));
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sugs.length > 0) {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = selectedIndex();
      if (idx >= 0 && sugs[idx]) {
        selectEntity(sugs[idx]);
      } else if (sugs.length > 0) {
        selectEntity(sugs[0]);
      }
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  onMount(() => {
    // Randomize starting synonym after hydration (SSR-safe — see init).
    setSynonymIndex(Math.floor(Math.random() * SEARCH_SYNONYMS.length));
    if (props.autoFocus) {
      setTimeout(() => inputRef?.focus(), 100);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div class="search-bar">
      <form class="search-bar-form" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder()}
          class="search-bar-input"
          autocomplete="off"
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeydown}
        />
      </form>
      <Show when={open()}>
        <div ref={dropdownRef} class="search-suggestions-dropdown">
          <Show
            when={suggestions().length > 0}
            fallback={<div class="search-no-results">No results found</div>}
          >
            <For each={suggestions()}>
              {(entity, i) => (
                <button
                  type="button"
                  class="search-suggestion-item"
                  classList={{ selected: selectedIndex() === i() }}
                  tabIndex={-1}
                  onMouseDown={() => selectEntity(entity)}
                >
                  <div class="search-suggestion-info">
                    <div class="search-suggestion-name">{entity.name}</div>
                    <div class="search-suggestion-meta">
                      {entity.type === 'player' ? (entity.team || 'Player') : 'Team'}
                    </div>
                  </div>
                  {entity.sport && (
                    <span class="search-suggestion-sport">
                      {getSportDisplay(entity.sport)}
                    </span>
                  )}
                </button>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
