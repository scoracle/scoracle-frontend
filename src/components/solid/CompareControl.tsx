/**
 * CompareControl — the "vs" button on the Slate's conditions line (players + teams).
 *
 * Not a Select: a Disclosure button that opens the <CompareSearch> autocomplete;
 * picking an entity sets `?vs=<id>` (ProfileContext), which makes the Composite
 * card render that entity beside the primary. Resolves the current `vs` id back to
 * an entity (via the bundled autocomplete data) so the trigger can read
 * "vs <name>" and CompareSearch can show its "vs <name> ×" pill; clearing it
 * removes the comparison. Reads "vs —" while no comparison is set.
 */
import { createSignal, createEffect, createMemo } from "solid-js";
import { useProfile } from "../../contexts/profile";
import Disclosure from "./Disclosure";
import CompareSearch from "./CompareSearch";
import { getDirectory } from "../../lib/data/entity-directory";
import type { AutocompleteEntity } from "../../lib/types";
import "./Select.css"; // shared trigger styling
import "./CompareControl.css";

export default function CompareControl() {
  const ctx = useProfile();
  const [entities, setEntities] = createSignal<AutocompleteEntity[]>([]);

  createEffect(() => {
    getDirectory(ctx.sport()).then(setEntities).catch(() => {});
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
        <span class="select-value">{ctx.vs() ? `vs ${selected()?.name ?? "…"}` : "vs —"}</span>
      )}
    >
      {(api) => (
        <div class="compare-control-panel search-popover">
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
