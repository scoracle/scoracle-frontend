/**
 * ContentShell — combined nav + content card for the profile page.
 *
 * Profile page collapses from a three-Shell stack to two cards
 * (MetaShell + ContentShell). This Shell wraps the tab nav at the
 * top and the active pane below it — splitting them into separate
 * cards read as visual noise, and the navigation card on its own felt
 * too slim to qualify as a card. One shell, one tarot silhouette.
 *
 * Sticky-mount preserved: a tab body mounts the first time its parent
 * + child combination becomes active, then stays in the DOM with CSS
 * hiding it when inactive. Switching back is instant — no re-mount,
 * no Suspense fallback flash, query() cache hits are warm.
 *
 * Six tab bodies total, mounted lazily:
 *   News mode  → NewsTab (articles) | XTab | VibeCard
 *   Stats mode → StatsTab (graphs) | TraitsTab | CompareTab
 */

import { Show, Suspense, createSignal, createEffect, type JSX } from "solid-js";
import { useProfile } from "../../contexts/profile";
import NewsTab, { NewsTabSkeleton } from "./NewsTab";
import XTab, { XTabSkeleton } from "./XTab";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import StatsTab, { StatsTabSkeleton } from "./StatsTab";
import TraitsTab, { TraitsTabSkeleton } from "./TraitsTab";
import CompareTab, { CompareTabSkeleton } from "./CompareTab";
import Shell from "./Shell";
import TabShell from "./TabShell";
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
  { key: "news:news",     body: () => <NewsTab/>,    fallback: () => <NewsTabSkeleton/>    },
  { key: "news:x",        body: () => <XTab/>,       fallback: () => <XTabSkeleton/>       },
  { key: "news:vibes",    body: () => <VibeCard/>,   fallback: () => <VibeCardSkeleton/>   },
  { key: "stats:stats",   body: () => <StatsTab/>,   fallback: () => <StatsTabSkeleton/>   },
  { key: "stats:traits",  body: () => <TraitsTab/>,  fallback: () => <TraitsTabSkeleton/>  },
  { key: "stats:compare", body: () => <CompareTab/>, fallback: () => <CompareTabSkeleton/> },
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
  // inside their tab body — Shell renders the numeral when set and
  // falls back to the accent-circle dots when nothing is published.
  return (
    <Shell as="section" class="content-shell" aria-label="Profile content">
      <TabShell />
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
