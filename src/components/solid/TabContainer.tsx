/**
 * TabContainer — Generic signal-based tab container (Solid.js)
 *
 * All tab panels are mounted up-front; CSS toggles visibility via the
 * `.active` class on each `.tab-panel`. Tabs run their own data fetches
 * eagerly on mount — the older "lazy-load on activation" gating was
 * removed because the perceived flicker on first activation outweighed
 * the saved bandwidth on a self-owned, edge-cached API.
 */

import { createSignal, For, type JSX } from "solid-js";
import "./TabContainer.css";

export interface TabDef {
  id: string;
  label: string;
  content: JSX.Element;
}

interface TabContainerProps {
  tabs: TabDef[];
  defaultTab: string;
  class?: string;
}

export default function TabContainer(props: TabContainerProps) {
  const [activeTab, setActiveTab] = createSignal(props.defaultTab);

  return (
    <div class={`tab-card card ${props.class || ""}`}>
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
            <div class="tab-panel" classList={{ active: activeTab() === tab.id }}>
              {tab.content}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
