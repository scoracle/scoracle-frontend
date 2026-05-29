/**
 * ScopeStrip — percentile-scope toggle (All <SPORT> | <scope-name>).
 *
 * The single source of the scope toggle shared by StatsCard and
 * TraitsCard. Derives availability + the scope label from the passed
 * stats response and reads/writes the selected scope on ProfileContext,
 * so the user's choice persists as they flip between those cards.
 *
 * Self-gating: renders nothing when the response carries no scoped
 * percentiles, so callers can drop it straight into a toolbar without
 * their own `<Show>`. It renders ONLY the inline `<NavStrip>` (a bare
 * `.nav-strip` element) — the wrapping `.stats-toolbar` belongs to the
 * caller, which lets StatsCard sit this strip next to its rate toggle in
 * one shared toolbar row while TraitsCard uses it alone.
 */

import { createMemo, Show } from "solid-js";
import { useProfile } from "../../contexts/profile";
import { hasScopedPercentiles } from "../../lib/utils/stats-categorizer";
import type { StatsResponse } from "../../lib/data/stats.server";
import NavStrip from "./NavStrip";

interface ScopeStripProps {
  /** Stats response to read scope availability + scope_name from. */
  data: StatsResponse | null | undefined;
}

export default function ScopeStrip(props: ScopeStripProps) {
  const ctx = useProfile();
  const scopeAvailable = createMemo(() => hasScopedPercentiles(props.data));
  const scopeName = createMemo(
    () => props.data?.scoped_percentile_metadata?.scope_name ?? "",
  );

  return (
    <Show when={scopeAvailable() && scopeName()}>
      <NavStrip
        inline
        ariaLabel="Scope"
        active={ctx.percentileScope()}
        onSelect={(id) => ctx.setPercentileScope(id as "all" | "scoped")}
        items={[
          { id: "all", label: `All ${ctx.sport.toUpperCase()}` },
          { id: "scoped", label: scopeName() },
        ]}
      />
    </Show>
  );
}
