/**
 * ContentShell — flat-nav layout container for the profile page.
 *
 * One `<NavStrip>` over the registry's Card panes — for players:
 * Composite / Specialist / Starline / Vibes / News / Leaders; teams add
 * Roster (gated via `showFor`). Composite is the default landing tab (the
 * rating engine's datapoint pizza, the platform's headline output).
 * NavStrip is the platform's thin nav primitive — bare typographic surface
 * with a bottom hairline, NOT a card. Each Card's body is wrapped in its own
 * `<Shell>` below. Tab set + order are driven entirely by PROFILE_TABS —
 * this component renders whatever the registry declares, filtered by entity
 * type.
 *
 * Sticky-mount: a Card body mounts the first time its tab becomes
 * active, then stays in the DOM with CSS hiding it when inactive.
 * Re-activation is instant — no re-mount, no Suspense fallback flash,
 * query() cache hits are warm.
 */

import {
  Show, Suspense, createSignal, createEffect, For,
} from "solid-js";
import { createAsync } from "@solidjs/router";
import { useProfile, type ProfileTab } from "../../contexts/profile";
import { PROFILE_TABS } from "./profile-tabs";
import { getStarline } from "../../lib/data/starline.server";
import NavStrip from "./NavStrip";
import SeasonSelect from "./SeasonSelect";
import "./ContentShell.css";

export default function ContentShell() {
  const ctx = useProfile();

  // Tabs visible for this entity type (e.g. Roster is team-only). ctx.type is
  // fixed per profile, so this resolves once — no need for reactivity.
  const visibleTabs = PROFILE_TABS.filter((t) => !t.showFor || t.showFor(ctx.type));
  const navItems = visibleTabs.map((t) => ({ id: t.id, label: t.label }));

  // Scope row (below the tabs, above the cards) — the convention for all scope
  // selectors, which are dropdowns. Year selector first; season affects every card
  // (cards read ctx.season()). available_seasons rides the starline payload, whose
  // query() cache is shared with the cards, so it lands warm.
  const starline = createAsync(() => getStarline(ctx.sport, ctx.type, ctx.id, ctx.season()));
  const seasons = () => starline()?.available_seasons ?? [];

  // Sticky-mount: track which tabs have ever been activated. Once
  // activated, a pane stays in the DOM (CSS-hidden when inactive) so
  // switching back is instant.
  const [mounted, setMounted] = createSignal<Set<ProfileTab>>(
    new Set([ctx.activeTab()]),
  );

  createEffect(() => {
    const t = ctx.activeTab();
    setMounted((current) => {
      if (current.has(t)) return current;
      const next = new Set(current);
      next.add(t);
      return next;
    });
  });

  return (
    <section class="content-shell" aria-label="Profile content">
      <NavStrip
        items={navItems}
        active={ctx.activeTab()}
        onSelect={ctx.setActiveTab}
        ariaLabel="Profile section"
      />
      <Show when={seasons().length > 0}>
        <div class="scope-row">
          <SeasonSelect
            seasons={seasons()}
            value={ctx.season()}
            onChange={(s) => ctx.setSeason(s)}
            ariaLabel="Season"
          />
        </div>
      </Show>
      <div class="content-shell-panes">
        <For each={visibleTabs}>
          {(pane) => (
            <Show when={mounted().has(pane.id)}>
              <div
                class="content-shell-pane"
                classList={{ active: ctx.activeTab() === pane.id }}
                role="tabpanel"
              >
                <Suspense fallback={pane.fallback()}>{pane.body()}</Suspense>
              </div>
            </Show>
          )}
        </For>
      </div>
    </section>
  );
}
