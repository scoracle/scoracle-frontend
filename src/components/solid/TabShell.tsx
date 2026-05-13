/**
 * TabShell — profile-page tab nav primitive (parent + child rows).
 *
 * No Shell wrapping. The profile page renders <TabShell /> + the
 * active pane inside a single <ContentShell> Shell, so this component
 * is just the controls — the Shell chrome lives one level up.
 *
 * Two rows:
 *
 *   - Parent Tab — News / Stats (split-fill toggle)
 *   - Child Tab  — News / X / Vibes  OR  Stats / Traits / Compare
 *                  (depending on active parent)
 *
 * Reads + writes tab state via ProfileContext.
 */

import { For, Show } from "solid-js";
import { useProfile, type NewsSubTab, type StatsSubTab } from "../../contexts/profile";
import "./TabShell.css";

interface TabDef<T extends string> {
  id: T;
  label: string;
}

const NEWS_TABS: ReadonlyArray<TabDef<NewsSubTab>> = [
  { id: "news",  label: "News"  },
  { id: "x",     label: "X"     },
  { id: "vibes", label: "Vibes" },
];

const STATS_TABS: ReadonlyArray<TabDef<StatsSubTab>> = [
  { id: "stats",   label: "Stats"   },
  { id: "traits",  label: "Traits"  },
  { id: "compare", label: "Compare" },
];

export default function TabShell() {
  const ctx = useProfile();

  return (
    <nav class="tab-shell" aria-label="Profile sections">
      <div class="tab-shell-parent">
        <button
          type="button"
          class="tab-shell-parent-btn"
          classList={{ active: ctx.mode() === "news" }}
          onClick={() => ctx.setMode("news")}
          aria-pressed={ctx.mode() === "news"}
        >
          News
        </button>
        <button
          type="button"
          class="tab-shell-parent-btn"
          classList={{ active: ctx.mode() === "stats" }}
          onClick={() => ctx.setMode("stats")}
          aria-pressed={ctx.mode() === "stats"}
        >
          Stats
        </button>
      </div>

      <div class="tab-shell-child">
        <Show when={ctx.mode() === "news"}>
          <For each={NEWS_TABS}>
            {(tab) => (
              <button
                type="button"
                class="tab-shell-child-btn"
                classList={{ active: ctx.newsSubTab() === tab.id }}
                onClick={() => ctx.setNewsSubTab(tab.id)}
                aria-pressed={ctx.newsSubTab() === tab.id}
              >
                {tab.label}
              </button>
            )}
          </For>
        </Show>
        <Show when={ctx.mode() === "stats"}>
          <For each={STATS_TABS}>
            {(tab) => (
              <button
                type="button"
                class="tab-shell-child-btn"
                classList={{ active: ctx.statsSubTab() === tab.id }}
                onClick={() => ctx.setStatsSubTab(tab.id)}
                aria-pressed={ctx.statsSubTab() === tab.id}
              >
                {tab.label}
              </button>
            )}
          </For>
        </Show>
      </div>
    </nav>
  );
}
