import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import Icon from './Icon';
import { createProduct } from '../lib/product';
import { parseEntities } from '../../../src/lib/data/parse-entities';
import { getSportDisplay, type AutocompleteEntity } from '../../../src/lib/types';
import { searchEntities } from '../../../src/lib/utils/entity-search';
import { profilePath } from '../../../src/lib/utils/profile-url';
import '../../../src/components/solid/SearchBar.css';

/** Home's universal search owns readiness independently of optional story names. */
export default function SearchBar(props: { storyNames: string[] }) {
  const directory = createProduct<{ entities: Parameters<typeof parseEntities>[0] }>();
  const entities = createMemo(() => {
    const state = directory.state();
    return state.status === 'success' ? parseEntities(state.data.entities) : [];
  });
  const ready = () => directory.state().status === 'success';
  const [query, setQuery] = createSignal('');
  const [selected, setSelected] = createSignal(-1);
  const [open, setOpen] = createSignal(false);
  const [nameIndex, setNameIndex] = createSignal(0);
  const suggestions = createMemo(() => searchEntities(entities(), query(), { limit: 10, minQueryLength: 2 }));
  const placeholder = () => props.storyNames.length ? `Whose story? Try ${props.storyNames[nameIndex() % props.storyNames.length]}` : 'Whose story?';
  const href = (entity: AutocompleteEntity) => profilePath(entity.sport || 'nba', entity.type, entity.id, { name: entity.name });
  let input!: HTMLInputElement;
  let anchor!: HTMLDivElement;
  let dropdown!: HTMLDivElement;
  let blurTimer: ReturnType<typeof setTimeout> | undefined;
  const load = () => directory.load(`/data/entities.json?v=${__DATA_VERSION__}`);

  onMount(() => {
    setNameIndex(Math.floor(Math.random() * 1024));
    void load();
    onCleanup(() => clearTimeout(blurTimer));
  });
  createEffect(() => {
    if (ready() && document.activeElement === document.body) input.focus({ preventScroll: true });
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
    if (entity.type !== 'player') return '';
    const raw = entity.positionGroup || entity.position;
    const position = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
    return [entity.team, position].filter(Boolean).join(' - ');
  }
  function close() { setQuery(''); setSelected(-1); setOpen(false); }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { setOpen(false); setSelected(-1); input.blur(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!suggestions().length) return;
      setOpen(true);
      setSelected(index => event.key === 'ArrowDown' ? Math.min(index + 1, suggestions().length - 1) : Math.max(index - 1, 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const entity = suggestions()[Math.max(0, selected())];
      if (entity) { close(); window.location.assign(href(entity)); }
    }
  }
  return <div ref={anchor} class="search-bar search-bar-hero">
    <form class="search-bar-form" onSubmit={event => event.preventDefault()}>
      <Icon name="search" class="search-bar-icon" size={22} />
      <input ref={input} value={query()} type="text" role="combobox" aria-label="Search players and teams"
        aria-autocomplete="list" aria-expanded={open()} aria-controls="home-search-results"
        aria-activedescendant={open() && selected() >= 0 ? `home-search-${selected()}` : undefined}
        disabled={!ready()} aria-busy={directory.state().status === 'pending'} placeholder={placeholder()}
        class="search-bar-input" autocomplete="off"
        onInput={() => { setQuery(input.value); setSelected(-1); setOpen(input.value.length >= 2); }}
        onFocus={() => { clearTimeout(blurTimer); if (query().length >= 2) setOpen(true); }}
        onBlur={() => { blurTimer = setTimeout(() => { setOpen(false); setSelected(-1); }, 200); }}
        onKeyDown={keydown} />
    </form>
    <Show when={directory.state().status === 'error' || directory.state().status === 'empty'}>
      <div class="search-no-results" role="alert">Search unavailable. <button type="button" onClick={() => { void load(); }}>Retry</button></div>
    </Show>
    <Show when={open()}>
      <div ref={dropdown} id="home-search-results" role="listbox" aria-label="Search results" class="search-suggestions-dropdown">
        <Show when={suggestions().length} fallback={<div class="search-no-results" role="status">No results found</div>}>
          <For each={suggestions()}>{(entity, index) =>
            <a href={href(entity)} id={`home-search-${index()}`} role="option" aria-selected={selected() === index()} tabindex={-1}
              onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button !== 1) close(); }}
              class="search-suggestion-item" classList={{ selected: selected() === index() }}>
              <div class="search-suggestion-info"><div class="search-suggestion-name">{entity.name}</div><div class="search-suggestion-meta">{detail(entity)}</div></div>
              <span class="search-suggestion-sport">{getSportDisplay(entity.sport || 'nba')} {entity.type === 'player' ? 'Player' : 'Team'}</span>
            </a>
          }</For>
        </Show>
      </div>
    </Show>
  </div>;
}
