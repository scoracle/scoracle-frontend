/**
 * TabContainer — Generic signal-based tab container (Solid.js)
 *
 * Tab switching is a signal. Each tab's content factory receives an
 * `isActive` accessor — `true` only when (the card is active) AND (this
 * tab is the active one). Optional `cardActive` accessor lets a parent
 * (e.g., a flip card) gate the entire group, so an inactive card's
 * default tab doesn't trigger its fetch.
 */

import { createSignal, For, type JSX } from "solid-js";
import "./TabContainer.css";

export interface TabDef {
  id: string;
  label: string;
  /** Factory receives a reactive `isActive` accessor. */
  content: (isActive: () => boolean) => JSX.Element;
}

interface TabContainerProps {
  tabs: TabDef[];
  defaultTab: string;
  class?: string;
  /** When provided and false, every tab's `isActive` is false. Defaults to always-true. */
  cardActive?: () => boolean;
}

export default function TabContainer(props: TabContainerProps) {
  const [activeTab, setActiveTab] = createSignal(props.defaultTab);
  const cardActive = () => (props.cardActive ? props.cardActive() : true);

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
            <div
              class="tab-panel"
              classList={{ active: activeTab() === tab.id }}
            >
              {tab.content(() => cardActive() && activeTab() === tab.id)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
