/**
 * TabContainer — generic signal-based tab container (Solid.js)
 *
 * Pillar primitive. Pure structure — no card visual, no layout opinions
 * beyond the nav-on-top, content-below shape. Cards (project-side
 * compositions like flagship's ProfileCard or sandbox's eventual
 * LineupCard) wrap TabContainer and own the visual treatment.
 *
 * Lazy-mount, sticky-after. The default tab mounts on first render.
 * Other tabs mount the first time the user activates them; from that
 * point on, they stay in the DOM and a CSS toggle handles visibility on
 * subsequent switches. Net effect:
 *
 *   - Initial render: only the default tab's component runs.
 *   - First activation of Tab X: component initializes, data fetches;
 *     the per-tab <Suspense fallback={tab.fallback?.()}> handles loading.
 *   - Every subsequent switch back to Tab X: instant CSS toggle. No
 *     remount, no Suspense fallback flash.
 *
 * Suspense ownership: TabContainer owns the per-tab <Suspense>, not each
 * tab. This is the structural guarantee that catches every kind of
 * suspension a tab can throw — including createMemo/createAsync reads
 * that happen in the tab's component body (before any in-tab JSX has
 * rendered), which would otherwise bubble past an in-tab boundary to
 * the route's root <Suspense> and blank the entire page.
 */

import { Show, Suspense, createSignal, createEffect, For, type JSX } from "solid-js";
import Skeleton from "./Skeleton";
import "./TabContainer.css";

export interface TabDef {
  id: string;
  label: string;
  content: () => JSX.Element;
  /**
   * Loading skeleton shown while the tab's data is in flight (or its
   * component is initializing). Defaults to a generic 3-block list.
   */
  fallback?: () => JSX.Element;
}

interface TabContainerProps {
  tabs: TabDef[];
  defaultTab: string;
}

function DefaultTabFallback() {
  return (
    <div class="tab-loading-skeleton">
      <Skeleton shape="block" height={80} />
      <Skeleton shape="block" height={80} />
      <Skeleton shape="block" height={80} />
    </div>
  );
}

export default function TabContainer(props: TabContainerProps) {
  const [activeTab, setActiveTab] = createSignal(props.defaultTab);

  const [mounted, setMounted] = createSignal<Set<string>>(
    new Set([props.defaultTab]),
  );

  createEffect(() => {
    const id = activeTab();
    if (!mounted().has(id)) {
      setMounted((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  });

  return (
    <div class="tabs-root">
      <div class="tabs-nav">
        <For each={props.tabs}>
          {(tab) => (
            <button
              class="tab-btn"
              classList={{ active: activeTab() === tab.id }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>
      <div class="tabs-content">
        <For each={props.tabs}>
          {(tab) => (
            <Show when={mounted().has(tab.id)}>
              <div
                class="tab-panel"
                classList={{ active: activeTab() === tab.id }}
              >
                <Suspense fallback={tab.fallback ? tab.fallback() : <DefaultTabFallback />}>
                  {tab.content()}
                </Suspense>
              </div>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
