/**
 * CompareControl — the ScopeStrip "Compare" disclosure (players).
 *
 * A Disclosure trigger that drops down the existing <CompareSearch> autocomplete;
 * picking an entity sets `?vs=<id>` (ProfileContext), which makes the Composite
 * card render that entity beside the primary. Resolves the current `vs` id back to
 * an entity (via the bundled autocomplete data) so CompareSearch can show its
 * "vs <name> ×" pill and clearing it removes the comparison.
 */
import { createSignal, createEffect, createMemo } from "solid-js";
import { useProfile } from "../../contexts/profile";
import Disclosure from "./Disclosure";
import CompareSearch from "./CompareSearch";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import type { AutocompleteEntity } from "../../lib/types";
import "./Select.css"; // shared trigger styling
import "./CompareControl.css";

export default function CompareControl() {
  const ctx = useProfile();
  const [entities, setEntities] = createSignal<AutocompleteEntity[]>([]);

  createEffect(() => {
    entityDataStore.getEntities(ctx.sport()).then(setEntities).catch(() => {});
  });

  const selected = createMemo<AutocompleteEntity | null>(() => {
    const v = ctx.vs();
    if (!v) return null;
    return entities().find((e) => e.id === v && e.type === ctx.type()) ?? null;
  });

  return (
    <Disclosure
      class="compare-control"
      triggerClass="select-trigger"
      haspopup="dialog"
      ariaLabel="Compare"
      trigger={() => (
        <>
          <span class="select-value">{ctx.vs() ? "Comparing" : "Compare"}</span>
          <span class="select-chevron" aria-hidden="true" />
        </>
      )}
    >
      {(api) => (
        <div class="compare-control-panel">
          <CompareSearch
            sport={ctx.sport()}
            entityType={ctx.type()}
            excludeId={ctx.id()}
            selected={selected()}
            onSelect={(e) => {
              ctx.setVs(e ? e.id : null);
              if (e) api.close();
            }}
          />
        </div>
      )}
    </Disclosure>
  );
}
