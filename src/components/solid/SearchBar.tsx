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
import { A, useNavigate } from '@solidjs/router';
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
  const navigate = useNavigate();

  function profileHrefFor(entity: AutocompleteEntity): string {
    const sportParam = (entity.sport || sport()).toUpperCase();
    return `/profile?sport=${sportParam}&type=${entity.type}&id=${entity.id}`;
  }

  // Synonym index initializes to 0 for SSR-safe rendering; randomized
  // on mount so server and client render identical HTML, then the
  // client picks a random starting synonym after hydration.
  const [synonymIndex, setSynonymIndex] = createSignal(0);
  const [query, setQuery] = createSignal('');
  const [allData, setAllData] = createSignal<AutocompleteEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [open, setOpen] = createSignal(false);
  // Bumped when team meta arrives for the current sport — the suggestion
  // detail line reads `getTeamMetaSync` which is a plain Map lookup
  // (non-reactive), so we need an explicit dependency to re-render the
  // dropdown once meta loads. Read inside `suggestionDetail`.
  const [metaTick, setMetaTick] = createSignal(0);
  const metaRequested = new Set<string>();

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

  // Reset state after a selection is committed. The dropdown should
  // disappear immediately — staying open with a list of matches under
  // the input after the user has already picked one reads as visual
  // noise. Clear the input + selected highlight too so a return to
  // the page (e.g., a back navigation through the header SearchBar)
  // starts fresh.
  function closeDropdown() {
    batch(() => {
      setQuery('');
      setSelectedIndex(-1);
      setOpen(false);
    });
    if (inputRef) inputRef.value = '';
  }

  // Programmatic navigation for keyboard Enter — uses the router's
  // client-side transition path. Mouse clicks go through the rendered
  // <A> elements directly, which gives us hover-preload + native
  // modifier-key behavior (Ctrl-click / middle-click open in new tab).
  function selectEntity(entity: AutocompleteEntity) {
    closeDropdown();
    navigate(profileHrefFor(entity));
  }

  // Mouse-click path: <A> handles navigation natively (preserving
  // hover-preload + modifier-key behavior). We just close the dropdown
  // here. Skip closing on modifier-click (ctrl/cmd/middle) since the
  // user is opening a new tab and expects the current page state to
  // persist — the SearchBar instance stays mounted in that case.
  function handleSuggestionClick(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    closeDropdown();
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
    // Lazily warm team meta for the current sport so team suggestions
    // can show conference / league below the name. Fires once per sport.
    const s = sport();
    if (s && !metaRequested.has(s)) {
      metaRequested.add(s);
      entityDataStore.loadMeta(s).then(() => {
        if (sport() === s) setMetaTick((t) => t + 1);
      }).catch(() => {});
    }
  }

  function suggestionDetail(entity: AutocompleteEntity): string {
    if (entity.type === 'player') {
      const team = entity.team;
      // positionGroup is the display form ("Midfielder"); position is the
      // raw code ("MF"). Prefer the readable one, fall back to the code.
      const rawPos = entity.positionGroup || entity.position;
      const pos = rawPos ? rawPos.charAt(0).toUpperCase() + rawPos.slice(1) : '';
      if (team && pos) return `${team} - ${pos}`;
      return team || pos || '';
    }
    // Read metaTick() so the closure re-evaluates after loadMeta resolves.
    metaTick();
    const meta = entityDataStore.getTeamMetaSync(entity.sport || sport(), entity.id);
    return meta?.conference || meta?.league?.name || '';
  }

  function suggestionTypeLabel(entity: AutocompleteEntity): string {
    return entity.type === 'player' ? 'Player' : 'Team';
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
                <A
                  href={profileHrefFor(entity)}
                  class="search-suggestion-item"
                  classList={{ selected: selectedIndex() === i() }}
                  tabIndex={-1}
                  onClick={handleSuggestionClick}
                >
                  <div class="search-suggestion-info">
                    <div class="search-suggestion-name">{entity.name}</div>
                    <div class="search-suggestion-meta">
                      {suggestionDetail(entity)}
                    </div>
                  </div>
                  <span class="search-suggestion-sport">
                    {suggestionTypeLabel(entity)}
                  </span>
                </A>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
