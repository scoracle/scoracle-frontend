import { useProfileRead } from "../../lib/data/profile-data";
import { revalidate } from "@solidjs/router";
/**
 * CompareControl — the "vs" button on the NavWell's conditions line (players + teams).
 *
 * Not a Select: a Disclosure button that opens the <CompareSearch> autocomplete;
 * picking an entity sets `?vs=<id>` (ProfileContext), which makes the Composite
 * card render that entity beside the primary. Resolves the current `vs` id back to
 * an entity (via the bundled autocomplete data) so the trigger can read
 * "vs <name>" and CompareSearch can show its "vs <name> ×" pill; clearing it
 * removes the comparison. Reads "vs —" while no comparison is set.
 */
import { createMemo, Loading, Errored } from "solid-js";
import { useProfile } from "../../contexts/profile";
import Disclosure from "./Disclosure";
import CompareSearch from "./CompareSearch";
import { getDirectory } from "../../lib/data/entity-directory";
import type { AutocompleteEntity } from "../../lib/types";
import "./Select.css"; // shared trigger styling
import "./CompareControl.css";
export default function CompareControl() {
    const ctx = useProfile();
    const comparisonMeta = useProfileRead("comparisonMeta");
    const selected = createMemo<AutocompleteEntity | null>(() => {
        const v = ctx.vs();
        if (!v)
            return null;
        const meta = comparisonMeta();
        return meta ? { id: v, name: meta.name, type: ctx.type(), sport: ctx.sport() } : null;
    });
    return (<Disclosure class="compare-control" triggerClass="select-trigger" haspopup="dialog" ariaLabel="Compare" trigger={() => (<span class="select-value">{ctx.vs() ? `vs ${selected()?.name ?? "…"}` : "vs —"}</span>)}>
      {(api) => (<div class="compare-control-panel search-popover">
          <Errored fallback={(_error, reset) => <p role="alert">Search unavailable. <button onClick={() => { revalidate(getDirectory.key); reset(); }}>Retry</button></p>}>
          <Loading fallback={<p role="status">Loading search…</p>}>
          <CompareSearch sport={ctx.sport()} entityType={ctx.type()} excludeId={ctx.id()} selected={selected()} onSelect={(e) => {
                ctx.setVs(e ? e.id : null);
                if (e)
                    api.close();
            }}/></Loading></Errored>
        </div>)}
    </Disclosure>);
}
