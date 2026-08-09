/**
 * SearchBar — Shared autocomplete search component (Solid.js)
 *
 * Fully reactive Solid component used on both the home page and the
 * header/profile surfaces. Suggestions,
 * keyboard navigation, and placeholder cycling are all signal-driven.
 *
 * `scope="global"` searches the universal local entity index. `scope="sport"`
 * searches only `$currentSport`, used by same-sport profile compare controls.
 */

import {
  createSignal, createMemo, createEffect, on,
  onMount, onCleanup, batch, Show, For,
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import {
  getDirectory, getUniversalDirectory, getSportMetaMaps,
} from '../../lib/data/entity-directory';
import { getSportDisplay, type AutocompleteEntity, type TeamMeta } from '../../lib/types';
import { searchEntities } from '../../lib/utils/entity-search';
import { profilePath } from '../../lib/utils/profile-url';
import { currentSport } from '../../stores/sport';
import './SearchBar.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Search every sport, or stay scoped to the active sport for profile compare controls. */
  scope?: 'global' | 'sport';
  /** Visual density. Home uses "hero"; rails and popovers use "compact". */
  variant?: 'standard' | 'hero' | 'compact';
  /** Caller-owned candidate list for scoped popovers such as Compare. */
  entities?: AutocompleteEntity[];
  /** Entity names the hero placeholder offers as story prompts ("Whose
   *  story? Try {name}") — the home page passes the movers feed, so the
   *  landing text leads with whoever the ball is showing. Hero variant
   *  only; when absent or empty the hero asks "Whose story?" alone. */
  storyNames?: string[];
  /** Placeholder override for compact/product-specific placements. */
  placeholder?: string;
  /** Result count override. */
  maxSuggestions?: number;
  /** Called with the picked entity. When omitted, SearchBar navigates to profile. */
  onPick?: (entity: AutocompleteEntity) => void;
  /** Called when user interacts with the search (focus, input) */
  onInteraction?: () => void;
  /** Auto-focus the input on mount (home page) */
  autoFocus?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_SUGGESTIONS = 10;
const MIN_QUERY_LENGTH = 2;

/** How long each story prompt holds before the next name surfaces. Offset
 *  from the ball's 3s cycle so the two never read as lockstepped chrome. */
const STORY_PROMPT_INTERVAL = 3500;

// ─── Component ──────────────────────────────────────────────────────────────

export default function SearchBar(props: SearchBarProps) {
  const sport = currentSport;
  const navigate = useNavigate();
  const scope = () => props.scope ?? 'sport';
  const variant = () => props.variant ?? 'standard';
  const maxSuggestions = () => props.maxSuggestions ?? MAX_SUGGESTIONS;

  function profileHrefFor(entity: AutocompleteEntity): string {
    return profilePath(entity.sport || sport(), entity.type, entity.id, {
      name: entity.name,
    });
  }

  // The story prompt gates on mount for SSR-safe rendering: server and
  // client both paint the bare seeker line, then names cycle in after
  // hydration.
  const [mounted, setMounted] = createSignal(false);
  const [nameIndex, setNameIndex] = createSignal(0);
  const [query, setQuery] = createSignal('');
  const [allData, setAllData] = createSignal<AutocompleteEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [open, setOpen] = createSignal(false);
  // Team meta per sport (accumulates as sports are focused) — feeds the
  // suggestion detail line (conference / league under a team's name).
  const [teamMetaBySport, setTeamMetaBySport] = createSignal<Record<string, Record<string, TeamMeta>>>({});

  let inputRef!: HTMLInputElement;
  let dropdownRef!: HTMLDivElement;

  // ── Derived state ──────────────────────────────────────────────────────

  // The seeker's question, everywhere (Scott, 2026-08-08 — the old
  // "Peruse/Inspect/Browse teams and players" cycler read as a database,
  // not an oracle). The hero leads with a real entity when it has one:
  // the entity is the color of the product, and the landing text should
  // open a story, not describe a search index.
  const placeholder = createMemo(() => {
    if (props.placeholder) return props.placeholder;
    if (variant() === 'hero') {
      const names = props.storyNames ?? [];
      const name = mounted() && names.length > 0 ? names[nameIndex() % names.length] : null;
      return name ? `Whose story? Try ${name}` : 'Whose story?';
    }
    return 'Who do you seek?';
  });

  // Cycle the hero's story prompt through the offered names. Static under
  // prefers-reduced-motion (the first name still shows; it just holds).
  createEffect(() => {
    if (variant() !== 'hero' || !mounted()) return;
    const names = props.storyNames ?? [];
    if (names.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(
      () => setNameIndex((i) => i + 1),
      STORY_PROMPT_INTERVAL,
    );
    onCleanup(() => clearInterval(timer));
  });

  const suggestions = createMemo(() => {
    // Teams match against name + aliases + search_tokens (covers city names like
    // "detroit" → Pistons). Players stay name-only: their aliases carry team /
    // league metadata that would spam results ("chelsea" would list every
    // Chelsea player).
    return searchEntities(props.entities ?? allData(), query(), {
      limit: maxSuggestions(),
      minQueryLength: MIN_QUERY_LENGTH,
      mode: (item) => item.type === 'team' ? 'full' : 'name',
    });
  });

  // ── Effects ────────────────────────────────────────────────────────────

  // Load global home data once, or reload sport data whenever sport changes.
  // Effects run client-side only, so the directory JSON never rides SSR HTML.
  createEffect(() => {
    if (props.entities) return;
    if (scope() !== 'global') return;
    getUniversalDirectory().then(data => {
      if (scope() === 'global') setAllData(data);
    }).catch(() => {});
  });

  createEffect(on(sport, (s) => {
    if (props.entities) return;
    if (scope() === 'global') return;
    const target = s;
    getDirectory(target).then(data => {
      if (scope() === 'sport' && sport() === target) setAllData(data);
    }).catch(() => {});
  }));

  // On sport change (not initial): clear search state
  createEffect(on(sport, (_s, prev) => {
    if (scope() === 'sport' && prev !== undefined) {
      batch(() => {
        setQuery('');
        setSelectedIndex(-1);
        setOpen(false);
      });
      if (inputRef) inputRef.value = '';
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

  // Programmatic navigation for keyboard Enter. Mouse clicks go through
  // rendered anchors directly, preserving native modifier-key behavior
  // (Ctrl-click / middle-click open in new tab). Router navigate() keeps this
  // a client-side transition, same as the anchor path.
  function selectEntity(entity: AutocompleteEntity) {
    closeDropdown();
    if (props.onPick) {
      props.onPick(entity);
      return;
    }
    navigate(profileHrefFor(entity));
  }

  // Mouse-click path: anchors handle navigation natively. We just close the
  // dropdown here. Skip closing on modifier-click (ctrl/cmd/middle) since the
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
    // can show conference / league below the name. query() dedupes repeats.
    if (scope() === 'global') return;
    const s = sport();
    if (s && !teamMetaBySport()[s]) {
      getSportMetaMaps(s).then((maps) => {
        setTeamMetaBySport((current) => ({ ...current, [s]: maps.teams }));
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
    const meta = teamMetaBySport()[entity.sport || sport()]?.[entity.id];
    return meta?.conference || meta?.league?.name || '';
  }

  function suggestionTypeLabel(entity: AutocompleteEntity): string {
    const type = entity.type === 'player' ? 'Player' : 'Team';
    if (scope() !== 'global') return type;
    return `${getSportDisplay(entity.sport || sport())} ${type}`;
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
    // Arm the story prompt after hydration (SSR-safe — see init).
    setMounted(true);
    if (props.autoFocus) {
      setTimeout(() => inputRef?.focus(), 100);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      class="search-bar"
      classList={{
        'search-bar-hero': variant() === 'hero',
        'search-bar-compact': variant() === 'compact',
      }}
    >
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
                <Show
                  when={!props.onPick}
                  fallback={
                    <button
                      type="button"
                      class="search-suggestion-item"
                      classList={{ selected: selectedIndex() === i() }}
                      tabIndex={-1}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectEntity(entity);
                      }}
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
                    </button>
                  }
                >
                  <a
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
                  </a>
                </Show>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
