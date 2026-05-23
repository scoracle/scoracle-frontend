/**
 * ContentShell — flat-nav layout container for the profile page.
 *
 * One `<NavStrip>` over six sibling Card panes (Articles / X / Vibes /
 * Stats / Traits / Compare). NavStrip is the platform's thin nav
 * primitive — bare typographic surface with a bottom hairline, NOT a
 * card. Each Card's body is still wrapped in its own `<Shell>` below.
 *
 * Sticky-mount: a Card body mounts the first time its tab becomes
 * active, then stays in the DOM with CSS hiding it when inactive.
 * Re-activation is instant — no re-mount, no Suspense fallback flash,
 * query() cache hits are warm.
 */

import {
  Show, Suspense, createSignal, createEffect, For, type JSX,
} from "solid-js";
import { useProfile, type ProfileTab } from "../../contexts/profile";
import ArticlesCard, { ArticlesCardSkeleton } from "./ArticlesCard";
import XCard, { XCardSkeleton } from "./XCard";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import TrendsCard, { TrendsCardSkeleton } from "./TrendsCard";
import StatsCard, { StatsCardSkeleton } from "./StatsCard";
import TraitsCard, { TraitsCardSkeleton } from "./TraitsCard";
import CompareCard, { CompareCardSkeleton } from "./CompareCard";
import NavStrip from "./NavStrip";
import "./ContentShell.css";

interface PaneSpec {
  tab: ProfileTab;
  body: () => JSX.Element;
  fallback: () => JSX.Element;
}

const PANES: ReadonlyArray<PaneSpec> = [
  { tab: "news",    body: () => <ArticlesCard/>, fallback: () => <ArticlesCardSkeleton/> },
  { tab: "x",       body: () => <XCard/>,         fallback: () => <XCardSkeleton/>         },
  { tab: "vibes",   body: () => <VibeCard/>,     fallback: () => <VibeCardSkeleton/>     },
  { tab: "trends",  body: () => <TrendsCard/>,   fallback: () => <TrendsCardSkeleton/>   },
  { tab: "stats",   body: () => <StatsCard/>,     fallback: () => <StatsCardSkeleton/>     },
  { tab: "traits",  body: () => <TraitsCard/>,    fallback: () => <TraitsCardSkeleton/>    },
  { tab: "compare", body: () => <CompareCard/>,   fallback: () => <CompareCardSkeleton/>   },
];

const NAV_ITEMS: ReadonlyArray<{ id: ProfileTab; label: string }> = [
  { id: "news",    label: "Articles" },
  { id: "x",       label: "X"        },
  { id: "vibes",   label: "Vibes"    },
  { id: "trends",  label: "Trends"   },
  { id: "stats",   label: "Stats"    },
  { id: "traits",  label: "Traits"   },
  { id: "compare", label: "Compare"  },
];

export default function ContentShell() {
  const ctx = useProfile();

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
        items={NAV_ITEMS}
        active={ctx.activeTab()}
        onSelect={ctx.setActiveTab}
        ariaLabel="Profile section"
      />
      <div class="content-shell-panes">
        <For each={PANES}>
          {(pane) => (
            <Show when={mounted().has(pane.tab)}>
              <div
                class="content-shell-pane"
                classList={{ active: ctx.activeTab() === pane.tab }}
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
