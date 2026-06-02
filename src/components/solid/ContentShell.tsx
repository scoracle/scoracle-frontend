/**
 * ContentShell — flat-nav layout container for the profile page.
 *
 * One `<NavStrip>` over five sibling Card panes (Stats / Trends / Vibes /
 * Traits / News — Stats is the default landing tab, since the rated
 * value is the platform's headline output; Trends sits next-door
 * because the Rating + Vibe sparklines are the second-most-valuable
 * surface). NavStrip is the platform's thin nav primitive — bare
 * typographic surface with a bottom hairline, NOT a card. Each Card's
 * body is still wrapped in its own `<Shell>` below. The News pane is a
 * unified feed of articles + tweets (NewsCard). Compare folded into the
 * Stats card 2026-05-28 — the StatsCard header carries a compare search
 * bar and swaps to butterfly charts when a second entity is picked.
 *
 * Sticky-mount: a Card body mounts the first time its tab becomes
 * active, then stays in the DOM with CSS hiding it when inactive.
 * Re-activation is instant — no re-mount, no Suspense fallback flash,
 * query() cache hits are warm.
 */

import {
  Show, Suspense, createSignal, createEffect, For,
} from "solid-js";
import { useProfile, type ProfileTab } from "../../contexts/profile";
import { PROFILE_TABS } from "./profile-tabs";
import NavStrip from "./NavStrip";
import "./ContentShell.css";

export default function ContentShell() {
  const ctx = useProfile();

  // Tabs visible for this entity type (e.g. Roster is team-only). ctx.type is
  // fixed per profile, so this resolves once — no need for reactivity.
  const visibleTabs = PROFILE_TABS.filter((t) => !t.showFor || t.showFor(ctx.type));
  const navItems = visibleTabs.map((t) => ({ id: t.id, label: t.label }));

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
