import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import Icon from './Icon';
import { createProduct } from '../lib/product';
import { parseEntities } from '../lib/data/parse-entities';
import { getSportDisplay, type AutocompleteEntity } from '../lib/types';
import { searchEntities } from '../lib/utils/entity-search';
import { profilePath } from '../lib/utils/profile-url';
import './SearchBar.css';

/** Home's universal search and Compare's scoped search query /api/autofill directly. */
export default function SearchBar(props: { storyNames?: string[]; entities?: AutocompleteEntity[]; sport?: string; entityType?: 'player' | 'team'; excludeId?: string; onPick?: (entity: AutocompleteEntity) => void; placeholder?: string; compact?: boolean; teamDetails?: Record<string, string> }) {
  const directory = createProduct<{ results: Parameters<typeof parseEntities>[0] }>();
  const [mounted, setMounted] = createSignal(false);
  const ready = () => props.entities !== undefined || mounted();
  const [query, setQuery] = createSignal('');
  const [selected, setSelected] = createSignal(-1);
  const [open, setOpen] = createSignal(false);
  const [nameIndex, setNameIndex] = createSignal(0);
  let pendingLoad: Promise<unknown> | undefined;
  const suggestions = createMemo(() => {
    if (props.entities) return searchEntities(props.entities, query(), { limit: 10, minQueryLength: 2 });
    if (query().trim().length < 2) return [];
    const state = directory.state();
    return state.status === 'success' ? parseEntities(state.data?.results ?? [], props.sport) : [];
  });
  const placeholder = () => props.placeholder ?? (props.storyNames?.length ? `Whose story? Try ${props.storyNames[nameIndex() % props.storyNames.length]}` : 'Whose story?');
  const href = (entity: AutocompleteEntity) => profilePath(entity.sport || props.sport || 'nba', entity.type, entity.id, { name: entity.name });
  let input!: HTMLInputElement;
  let anchor!: HTMLDivElement;
  let dropdown!: HTMLDivElement;
  let blurTimer: ReturnType<typeof setTimeout> | undefined;
  const load = (raw = query()) => {
    const trimmed = raw.trim();
    if (trimmed.length < 2) {
      pendingLoad = directory.load(null);
      return pendingLoad;
    }
    const params = new URLSearchParams({ q: trimmed });
    if (props.sport) params.set('sport', props.sport.toLowerCase());
    if (props.entityType) params.set('type', props.entityType);
    if (props.excludeId) params.set('exclude_id', props.excludeId);
    pendingLoad = directory.load(`/api/autofill?${params}`);
    return pendingLoad;
  };

  onMount(() => {
    setNameIndex(Math.floor(Math.random() * 1024));
    setMounted(true);
    onCleanup(() => clearTimeout(blurTimer));
  });
  createEffect(() => {
    if (ready() && (props.compact || document.activeElement === document.body)) input.focus({ preventScroll: true });
  });
  createEffect(() => {
    if (!open()) return;
    const viewport = window.visualViewport;
    const updateRoom = () => {
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      anchor.style.setProperty('--search-room', `${Math.max(0, bottom - anchor.getBoundingClientRect().bottom - 12)}px`);
    };
    updateRoom();
    window.addEventListener('resize', updateRoom);
    window.addEventListener('scroll', updateRoom);
    viewport?.addEventListener('resize', updateRoom);
    viewport?.addEventListener('scroll', updateRoom);
    onCleanup(() => {
      window.removeEventListener('resize', updateRoom);
      window.removeEventListener('scroll', updateRoom);
      viewport?.removeEventListener('resize', updateRoom);
      viewport?.removeEventListener('scroll', updateRoom);
    });
  });
  createEffect(() => {
    const index = selected();
    if (index < 0 || !dropdown) return;
    const item = dropdown.querySelectorAll<HTMLElement>('.search-suggestion-item')[index];
    if (!item) return;
    if (item.offsetTop < dropdown.scrollTop) dropdown.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > dropdown.scrollTop + dropdown.clientHeight)
      dropdown.scrollTop = item.offsetTop + item.offsetHeight - dropdown.clientHeight;
  });
  function detail(entity: AutocompleteEntity) {
    if (entity.type !== 'player') return entity.conference || entity.league?.name || props.teamDetails?.[entity.id] || '';
    const raw = entity.positionGroup || entity.position;
    const position = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
    return [entity.team, position].filter(Boolean).join(' - ');
  }
  function close() { setQuery(''); setSelected(-1); setOpen(false); }
  function pick(entity: AutocompleteEntity | undefined) {
    if (!entity) return;
    close();
    if (props.onPick) props.onPick(entity);
    else window.location.assign(href(entity));
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { setOpen(false); setSelected(-1); input.blur(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!suggestions().length) {
        if (!props.entities && directory.state().status === 'pending' && event.key === 'ArrowDown') setSelected(0);
        return;
      }
      setOpen(true);
      setSelected(index => event.key === 'ArrowDown' ? Math.min(index + 1, suggestions().length - 1) : Math.max(index - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const current = suggestions()[Math.max(0, selected())];
      if (current) {
        pick(current);
      } else if (!props.entities && directory.state().status === 'pending' && pendingLoad) {
        const idx = Math.max(0, selected());
        void pendingLoad.then(() => pick(suggestions()[idx]));
      }
    }
  }
  return <div ref={anchor} class="search-bar" classList={{ "search-bar-hero": !props.compact, "search-bar-compact": !!props.compact }}>
    <form class="search-bar-form" onSubmit={event => event.preventDefault()}>
      <Icon name="search" class="search-bar-icon" size={22} />
      <input ref={input} value={query()} type="text" role="combobox" aria-label="Search players and teams"
        aria-autocomplete="list" aria-expanded={open()} aria-controls="home-search-results"
        aria-activedescendant={open() && selected() >= 0 ? `home-search-${selected()}` : undefined}
        disabled={!ready()} aria-busy={!props.entities && query().trim().length >= 2 && directory.state().status === 'pending'} placeholder={placeholder()}
        class="search-bar-input" autocomplete="off"
        onInput={() => { const next = input.value; setQuery(next); setSelected(-1); setOpen(next.trim().length >= 2); if (!props.entities) void load(next); }}
        onFocus={() => { clearTimeout(blurTimer); if (query().trim().length >= 2) setOpen(true); }}
        onBlur={() => { blurTimer = setTimeout(() => { setOpen(false); setSelected(-1); }, 200); }}
        onKeyDown={keydown} />
    </form>
    <Show when={!props.entities && query().trim().length >= 2 && (directory.state().status === 'error' || directory.state().status === 'empty')}>
      <div class="search-no-results" role="alert">Search unavailable. <button type="button" onClick={() => { clearTimeout(blurTimer); setOpen(true); input.focus({ preventScroll: true }); void load(); }}>Retry</button></div>
    </Show>
    <Show when={open() && (props.entities !== undefined || directory.state().status === 'success')}>
      <div ref={dropdown} id="home-search-results" role="listbox" aria-label="Search results" class="search-suggestions-dropdown">
        <Show when={suggestions().length} fallback={<div class="search-no-results" role="status">No results found</div>}>
          <For each={suggestions()}>{(entity, index) =>
            <a href={props.onPick ? undefined : href(entity)} id={`home-search-${index()}`} role="option" aria-selected={selected() === index()} tabindex={-1}
              onClick={event => { if (props.onPick) { event.preventDefault(); props.onPick(entity); close(); return; } if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button !== 1) close(); }}
              class="search-suggestion-item" classList={{ selected: selected() === index() }}>
              <div class="search-suggestion-info"><div class="search-suggestion-name">{entity.name}</div><div class="search-suggestion-meta">{detail(entity)}</div></div>
              <span class="search-suggestion-sport">{!props.compact && getSportDisplay(entity.sport || 'nba')} {entity.type === 'player' ? 'Player' : 'Team'}</span>
            </a>
          }</For>
        </Show>
      </div>
    </Show>
  </div>;
}
