/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout:
 *   EntityMeta (top)
 *   ├── card-flip-container (3D rotateY transition)
 *   │   ├── card-flip-front: NewsCard (News / X / Co-mentions / Vibes)
 *   │   └── card-flip-back:  StatsCard (Stats / Traits / Compare)
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123              — opens on News view (default)
 *   ?sport=NBA&type=player&id=123&view=stats   — opens on Stats view
 *
 * Entity params and view state flow through ProfileContext (see
 * src/contexts/profile.ts). The route reads `useSearchParams` once
 * (SSR-safe) and provides the values; descendants consume via
 * `useProfile()`. Cards are SSR-rendered (no `clientOnly` wrappers) — the
 * shell HTML is real, only the data fetches defer to client.
 *
 * Lazy-load gating: the active card's `cardActive` accessor flips with
 * `view()`, so only the visible face's default tab triggers its fetch.
 *
 * Flip-card height: a single ResizeObserver tracks both faces; whenever
 * `view()` changes, the active face's `scrollHeight` is written to the
 * container's `min-height`. The CSS transform doesn't affect scrollHeight,
 * so there's no need to suspend the observer during the flip.
 */

import { createSignal, createEffect, onMount, onCleanup, ErrorBoundary } from "solid-js";
import { isServer } from "solid-js/web";
import { useSearchParams } from "@solidjs/router";
import { useStore } from "@nanostores/solid";
import { ProfileContext, type ProfileContextValue } from "../contexts/profile";
import EntityMeta from "../components/solid/EntityMeta";
import NewsCard from "../components/solid/NewsCard";
import StatsCard from "../components/solid/StatsCard";
import { $entityInfo } from "../stores/entity";
import { entityDataStore } from "../lib/utils/entity-data-store";
import "./profile.css";

function CardError(props: { face: "news" | "stats"; err: unknown; reset: () => void }) {
  const message = props.err instanceof Error ? props.err.message : String(props.err);
  return (
    <div class="card-error" role="alert">
      <p class="card-error-title">
        Couldn't load the {props.face === "news" ? "News" : "Stats"} card.
      </p>
      <p class="card-error-detail">{message}</p>
      <button type="button" class="card-error-retry" onClick={props.reset}>
        Try again
      </button>
    </div>
  );
}

export default function Profile() {
  const [searchParams] = useSearchParams<{
    sport?: string;
    type?: string;
    id?: string;
    view?: string;
  }>();

  const sport = (searchParams.sport ?? "").toLowerCase();
  const entityType: "player" | "team" =
    searchParams.type === "team" ? "team" : "player";
  const id = searchParams.id ?? "";
  const initialView = searchParams.view === "stats" ? "stats" : "news";

  const [view, setView] = createSignal<"news" | "stats">(initialView);

  function updateViewParam(target: "news" | "stats") {
    if (isServer) return;
    const url = new URL(window.location.href);
    if (target === "stats") url.searchParams.set("view", "stats");
    else url.searchParams.delete("view");
    window.history.replaceState({}, "", url.toString());
  }

  const profileCtx: ProfileContextValue = {
    sport,
    type: entityType,
    id,
    view,
    setView: (v) => {
      if (v === view()) return;
      setView(v);
      updateViewParam(v);
    },
  };

  // Refs to the flip card containers. Bound after mount.
  let flipContainerRef: HTMLDivElement | undefined;
  let frontRef: HTMLDivElement | undefined;
  let backRef: HTMLDivElement | undefined;

  // Track entity name for document.title.
  const entity = useStore($entityInfo);

  createEffect(() => {
    const e = entity();
    if (!isServer && e?.name) {
      document.title = `${e.name} - Scoracle`;
    }
  });

  onMount(() => {
    // Kick off the bundled-JSON preload — meta is needed for EntityMeta's
    // instant hydration and CompareTab's candidate pool.
    entityDataStore.preloadAll();

    function updateHeight() {
      if (!flipContainerRef || !frontRef || !backRef) return;
      const activeEl = view() === "news" ? frontRef : backRef;
      flipContainerRef.style.minHeight = `${activeEl.scrollHeight}px`;
    }

    // Single observer for both faces — content-driven height changes
    // (e.g., a tab finishing its fetch) propagate to the container.
    // The CSS rotateY is a transform on the parent and doesn't affect
    // child scrollHeight, so the observer stays connected during the flip.
    const observer = new ResizeObserver(() => updateHeight());
    if (frontRef) observer.observe(frontRef);
    if (backRef) observer.observe(backRef);

    // Toggle-driven height changes.
    createEffect(() => {
      view();
      updateHeight();
    });

    onCleanup(() => observer.disconnect());
  });

  return (
    <ProfileContext.Provider value={profileCtx}>
      <main class="profile-main">
        <EntityMeta />
        <div class="card-flip-container" ref={flipContainerRef}>
          <div
            class="card-flip-inner"
            classList={{ flipped: view() === "stats" }}
          >
            <div class="card-flip-front" ref={frontRef}>
              <ErrorBoundary fallback={(err, reset) => <CardError face="news" err={err} reset={reset} />}>
                <NewsCard />
              </ErrorBoundary>
            </div>
            <div class="card-flip-back" ref={backRef}>
              <ErrorBoundary fallback={(err, reset) => <CardError face="stats" err={err} reset={reset} />}>
                <StatsCard />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
    </ProfileContext.Provider>
  );
}
