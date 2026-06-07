/**
 * SearchControl — a Disclosure-wrapped entity search for the control strip.
 *
 * A compact "Search" trigger that drops down an autocomplete over the current
 * sport + entity-type (bundled `/data/{sport}.json` via entityDataStore); picking
 * a result navigates to that profile. Built on the shared <Disclosure> (the
 * platform's one open/close/outside-click/keyboard behavior) so it reads as one
 * family with <Select>. Used on the leaderboard to jump to any entity, not just
 * the loaded top-N. Pillar-style — no flagship-specific imports beyond the
 * generic data tier.
 */
import { createSignal, createMemo, createEffect, For, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Disclosure, { type DisclosureApi } from "./Disclosure";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import { normalizeForSearch } from "../../lib/utils/search-normalize";
import type { AutocompleteEntity, EntityType } from "../../lib/types";
import "./Select.css"; // shared trigger styling (.select-trigger / -value / -chevron)
import "./SearchControl.css";

const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 8;

function fuzzyMatch(text: string, tokens: string[]): boolean {
  const textTokens = normalizeForSearch(text).split(/\s+/);
  return tokens.every((qt) => textTokens.some((tt) => tt.startsWith(qt)));
}

function profileHref(e: AutocompleteEntity, fallbackSport: string): string {
  return `/profile?sport=${(e.sport || fallbackSport).toUpperCase()}&type=${e.type}&id=${e.id}`;
}

/** The panel is its own component so its input auto-focuses on open (mounts when
 *  the Disclosure opens). */
function SearchPanel(props: {
  api: DisclosureApi;
  suggestions: () => AutocompleteEntity[];
  query: () => string;
  setQuery: (v: string) => void;
  entityType: EntityType;
  onPick: (e: AutocompleteEntity) => void;
}) {
  let inputRef!: HTMLInputElement;
  const [hi, setHi] = createSignal(-1);
  onMount(() => inputRef?.focus());

  function onKeyDown(e: KeyboardEvent) {
    const s = props.suggestions();
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(s.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const pick = s[hi()] ?? s[0]; if (pick) props.onPick(pick); }
  }

  return (
    <div id={props.api.panelId} class="search-control-panel" role="listbox">
      <input
        ref={inputRef}
        type="search"
        class="search-control-input"
        placeholder="Search players or teams…"
        autocomplete="off"
        value={props.query()}
        onInput={(e) => { props.setQuery(e.currentTarget.value); setHi(-1); }}
        onKeyDown={onKeyDown}
      />
      <Show when={props.suggestions().length > 0}>
        <ul class="search-control-list">
          <For each={props.suggestions()}>
            {(e, i) => (
              <li
                role="option"
                class="search-control-option"
                classList={{ highlighted: hi() === i() }}
                aria-selected={hi() === i()}
                onMouseDown={(ev) => { ev.preventDefault(); props.onPick(e); }}
                onMouseEnter={() => setHi(i())}
              >
                <span class="search-control-name">{e.name}</span>
                <span class="search-control-meta">
                  {props.entityType === "player" ? (e.team || "Player") : "Team"}
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

export default function SearchControl(props: {
  sport: string;
  entityType: EntityType;
  ariaLabel?: string;
}) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = createSignal<AutocompleteEntity[]>([]);
  const [query, setQuery] = createSignal("");

  createEffect(() => {
    const sport = props.sport;
    const type = props.entityType;
    entityDataStore
      .getEntities(sport)
      .then((list) => setCandidates(list.filter((e) => e.type === type)))
      .catch(() => {});
  });

  const suggestions = createMemo(() => {
    const q = normalizeForSearch(query());
    if (q.length < MIN_QUERY_LENGTH) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return candidates()
      .filter((item) => {
        const haystack = item._searchIndex ?? normalizeForSearch(item.name);
        return haystack.includes(q) || (tokens.length > 1 && fuzzyMatch(item.name, tokens));
      })
      .slice(0, MAX_SUGGESTIONS);
  });

  return (
    <Disclosure
      class="search-control"
      triggerClass="select-trigger"
      haspopup="listbox"
      ariaLabel={props.ariaLabel ?? "Search"}
      trigger={() => (
        <>
          <span class="select-value">Search</span>
          <span class="select-chevron" aria-hidden="true" />
        </>
      )}
    >
      {(api) => (
        <SearchPanel
          api={api}
          suggestions={suggestions}
          query={query}
          setQuery={setQuery}
          entityType={props.entityType}
          onPick={(e) => { api.close(); navigate(profileHref(e, props.sport)); }}
        />
      )}
    </Disclosure>
  );
}
