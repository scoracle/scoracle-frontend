/**
 * ContentShell — combined nav + content card for the profile page.
 *
 * One Shell wraps two NavTabs strips (primary mode row + secondary
 * sub-row driven by the active mode) plus the active card pane below.
 * Splitting nav and content into separate cards read as visual noise,
 * and a nav-only card felt too slim on its own — so they share one
 * tarot silhouette.
 *
 * Sticky-mount preserved: a card body mounts the first time its
 * (mode, sub-tab) pair becomes active, then stays in the DOM with CSS
 * hiding it when inactive. Switching back is instant — no re-mount,
 * no Suspense fallback flash, query() cache hits are warm.
 *
 * Six card bodies total, mounted lazily:
 *   News mode  → ArticlesCard | XCard | VibeCard
 *   Stats mode → StatsCard | TraitsCard | CompareCard
 */

import {
  Show, Suspense, createSignal, createEffect, type JSX,
} from "solid-js";
import {
  useProfile,
  type ProfileMode, type NewsSubTab, type StatsSubTab,
} from "../../contexts/profile";
import ArticlesCard, { ArticlesCardSkeleton } from "./ArticlesCard";
import XCard, { XCardSkeleton } from "./XCard";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import StatsCard, { StatsCardSkeleton } from "./StatsCard";
import TraitsCard, { TraitsCardSkeleton } from "./TraitsCard";
import CompareCard, { CompareCardSkeleton } from "./CompareCard";
import NavTabs from "./NavTabs";
import Shell from "./Shell";
import "./ContentShell.css";

interface PaneSpec {
  /** Composite key — `${mode}:${tabId}`. */
  key: string;
  /** Render the live content. */
  body: () => JSX.Element;
  /** Skeleton fallback for the per-pane Suspense boundary. */
  fallback: () => JSX.Element;
}

const PANES: ReadonlyArray<PaneSpec> = [
  { key: "news:news",     body: () => <ArticlesCard/>, fallback: () => <ArticlesCardSkeleton/> },
  { key: "news:x",        body: () => <XCard/>,         fallback: () => <XCardSkeleton/>         },
  { key: "news:vibes",    body: () => <VibeCard/>,     fallback: () => <VibeCardSkeleton/>     },
  { key: "stats:stats",   body: () => <StatsCard/>,     fallback: () => <StatsCardSkeleton/>     },
  { key: "stats:traits",  body: () => <TraitsCard/>,    fallback: () => <TraitsCardSkeleton/>    },
  { key: "stats:compare", body: () => <CompareCard/>,   fallback: () => <CompareCardSkeleton/>   },
];

const MODE_ITEMS: ReadonlyArray<{ id: ProfileMode; label: string }> = [
  { id: "news",  label: "News"  },
  { id: "stats", label: "Stats" },
];

const NEWS_SUB_ITEMS: ReadonlyArray<{ id: NewsSubTab; label: string }> = [
  { id: "news",  label: "Articles" },
  { id: "x",     label: "X"        },
  { id: "vibes", label: "Vibes"    },
];

const STATS_SUB_ITEMS: ReadonlyArray<{ id: StatsSubTab; label: string }> = [
  { id: "stats",   label: "Stats"   },
  { id: "traits",  label: "Traits"  },
  { id: "compare", label: "Compare" },
];

export default function ContentShell() {
  const ctx = useProfile();

  // Composite key for the currently active pane.
  const activeKey = (): string =>
    ctx.mode() === "news"
      ? `news:${ctx.newsSubTab()}`
      : `stats:${ctx.statsSubTab()}`;

  // Sticky-mount: track which panes have ever been activated. Once
  // activated, a pane stays in the DOM (CSS-hidden when inactive) so
  // switching back is instant.
  const [mounted, setMounted] = createSignal<Set<string>>(new Set([activeKey()]));

  createEffect(() => {
    const k = activeKey();
    setMounted((current) => {
      if (current.has(k)) return current;
      const next = new Set(current);
      next.add(k);
      return next;
    });
  });

  // Corner-slot chrome is owned by <Shell>. Cards (e.g., VibeCard)
  // publish their corner content via useShell()?.setCornerLabel from
  // inside their card body — Shell renders the numeral when set and
  // falls back to the accent-circle dots when nothing is published.
  return (
    <Shell as="section" class="content-shell" aria-label="Profile content">
      <NavTabs
        items={MODE_ITEMS}
        active={ctx.mode()}
        onSelect={ctx.setMode}
        variant="primary"
        ariaLabel="Profile mode"
      />
      <Show when={ctx.mode() === "news"}>
        <NavTabs
          items={NEWS_SUB_ITEMS}
          active={ctx.newsSubTab()}
          onSelect={ctx.setNewsSubTab}
          variant="sub"
          ariaLabel="News section"
        />
      </Show>
      <Show when={ctx.mode() === "stats"}>
        <NavTabs
          items={STATS_SUB_ITEMS}
          active={ctx.statsSubTab()}
          onSelect={ctx.setStatsSubTab}
          variant="sub"
          ariaLabel="Stats section"
        />
      </Show>
      <div class="content-shell-panes">
        {PANES.map((pane) => (
          <Show when={mounted().has(pane.key)}>
            <div
              class="content-shell-pane"
              classList={{ active: activeKey() === pane.key }}
              role="tabpanel"
            >
              <Suspense fallback={pane.fallback()}>{pane.body()}</Suspense>
            </div>
          </Show>
        ))}
      </div>
    </Shell>
  );
}
