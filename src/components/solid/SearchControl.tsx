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
import { createSignal, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Disclosure from "./Disclosure";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import type { AutocompleteEntity, EntityType } from "../../lib/types";
import SearchBar from "./SearchBar";
import "./Select.css"; // shared trigger styling (.select-trigger / -value / -chevron)
import "./SearchControl.css";

function profileHref(e: AutocompleteEntity, fallbackSport: string): string {
  return `/profile?sport=${(e.sport || fallbackSport).toUpperCase()}&type=${e.type}&id=${e.id}`;
}

export default function SearchControl(props: {
  sport: string;
  entityType: EntityType;
  ariaLabel?: string;
}) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = createSignal<AutocompleteEntity[]>([]);

  createEffect(() => {
    const sport = props.sport;
    const type = props.entityType;
    entityDataStore
      .getEntities(sport)
      .then((list) => setCandidates(list.filter((e) => e.type === type)))
      .catch(() => {});
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
        <div id={api.panelId} class="search-control-panel">
          <SearchBar
            variant="compact"
            entities={candidates()}
            placeholder={`Search ${props.entityType}s`}
            maxSuggestions={8}
            autoFocus
            onPick={(e) => {
              api.close();
              navigate(profileHref(e, props.sport));
            }}
          />
        </div>
      )}
    </Disclosure>
  );
}
