/**
 * TabContainer — Generic signal-based tab container (Solid.js)
 *
 * Tab switching is a signal. Each tab's content factory receives an
 * `isActive` accessor so child components can react to activation
 * (e.g., lazy-load data on first open).
 */

import { createSignal, For, type JSX } from 'solid-js';
import './TabContainer.css';

export interface TabDef {
  id: string;
  label: string;
  /** Factory receives a reactive `isActive` accessor — called once at mount */
  content: (isActive: () => boolean) => JSX.Element;
}

interface TabContainerProps {
  tabs: TabDef[];
  defaultTab: string;
  class?: string;
}

export default function TabContainer(props: TabContainerProps) {
  const [activeTab, setActiveTab] = createSignal(props.defaultTab);

  return (
    <div class={`tab-card card ${props.class || ''}`}>
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
              {tab.content(() => activeTab() === tab.id)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
