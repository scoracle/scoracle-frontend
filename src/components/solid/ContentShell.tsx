/**
 * ContentShell — pure-content Shell of the three-Shell profile stack.
 *
 * The bottom Shell. Renders the active Card based on tab state in
 * ProfileContext. No nav UI (that's TabShell's job). No mode toggle. Just
 * the Card the user selected.
 *
 * Sticky-mount preserved: a tab body mounts the first time its parent +
 * child combination becomes active, then stays in the DOM with CSS hiding
 * it when inactive. Switching back is instant — no re-mount, no Suspense
 * fallback flash, query() cache hits are warm.
 *
 * Six tab bodies total, mounted lazily:
 *   News mode  → NewsTab (articles) | XTab | VibeCard
 *   Stats mode → StatsTab (graphs) | TraitsTab | CompareTab
 *
 * (Old `VibesTab` is now `VibeCard`; other component-level renames stay
 * opportunistic per the v2 vocabulary lock.)
 */

import { Show, Suspense, createSignal, createEffect, type JSX } from "solid-js";
import { useProfile } from "../../contexts/profile";
import NewsTab, { NewsTabSkeleton } from "./NewsTab";
import XTab, { XTabSkeleton } from "./XTab";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import StatsTab, { StatsTabSkeleton } from "./StatsTab";
import TraitsTab, { TraitsTabSkeleton } from "./TraitsTab";
import CompareTab, { CompareTabSkeleton } from "./CompareTab";
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

  // Corner-slot chrome lives at the Shell level (v2 chrome lift, locked
  // 2026-05-10). When a Card publishes a label to ctx.cornerLabel (e.g.,
  // VibeCard's archetype Roman numeral), render the numeral; otherwise
  // fall back to the neutral corner dot. The DOM elements stay mounted
  // either way — content swaps in place — so tab flips are visually
  // quiet (no chrome blink as panes display:none/block).
  const hasLabel = (): boolean => ctx.cornerLabel() != null && ctx.cornerLabel() !== "";

  return (
    <section
      class="content-shell card"
      classList={{ "has-corner-label": hasLabel() }}
      aria-label="Profile content"
    >
      <span class="shell-corner-num shell-corner-num-tl" aria-hidden="true">{ctx.cornerLabel()}</span>
      <span class="shell-corner-num shell-corner-num-br" aria-hidden="true">{ctx.cornerLabel()}</span>
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
    </section>
  );
}
