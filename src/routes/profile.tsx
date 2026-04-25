/**
 * Profile route — unified entity profile (player or team)
 *
 * Layout:
 *   EntityMeta (top)
 *   ├── card-flip-container (3D rotateY transition)
 *   │   ├── card-flip-front: NewsCard (News / X / Co-mentions / Vibes)
 *   │   └── card-flip-back:  StatsCard (Stats / Traits / Compare)
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123        — opens on News view (default)
 *   ?sport=NBA&type=player&id=123&view=stats — opens on Stats view
 *
 * SSR boundary: EntityMeta, NewsCard, StatsCard all read window.location.search
 * at component setup (verbatim ports from the Astro repo). They're consumed via
 * `clientOnly` from `@solidjs/start` so the server returns the route shell only;
 * the cards hydrate on the client. `entityType` comes from `useSearchParams` at
 * the route level (SSR-safe), so the route shell renders the correct flip-card
 * variant on the server.
 *
 * The flip-card height management ports the imperative ResizeObserver pattern
 * from `~/Scoracle/src/pages/profile.astro`'s inline `<script>`: observer is
 * suspended during the flip transition to prevent layout thrashing; reconnected
 * after `transitionend` (with a 700 ms safety fallback for reduced-motion).
 */

import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { isServer } from "solid-js/web";
import { clientOnly } from "@solidjs/start";
import { useSearchParams } from "@solidjs/router";
import { useStore } from "@nanostores/solid";
import { $entityInfo } from "../stores/entity";
import { entityDataStore } from "../lib/utils/entity-data-store";
import "./profile.css";

const EntityMeta = clientOnly(() => import("../components/solid/EntityMeta"));
const NewsCard = clientOnly(() => import("../components/solid/NewsCard"));
const StatsCard = clientOnly(() => import("../components/solid/StatsCard"));

export default function Profile() {
  const [searchParams] = useSearchParams<{ type?: string; view?: string }>();

  const entityType = (): "player" | "team" =>
    searchParams.type === "team" ? "team" : "player";

  // Initial view from URL — EntityMeta reads the same `?view` param so the
  // toggle state matches without needing an init dispatch.
  const initialView = searchParams.view === "stats" ? "stats" : "news";
  const [view, setView] = createSignal<"news" | "stats">(initialView);
  const [isFlipping, setIsFlipping] = createSignal(false);

  // Refs to the flip card containers. Bound after mount.
  let flipContainerRef: HTMLDivElement | undefined;
  let flipInnerRef: HTMLDivElement | undefined;
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

  // Update the URL `?view` param without a navigation.
  function updateViewParam(target: "news" | "stats") {
    if (isServer) return;
    const url = new URL(window.location.href);
    if (target === "stats") url.searchParams.set("view", "stats");
    else url.searchParams.delete("view");
    window.history.replaceState({}, "", url.toString());
  }

  onMount(() => {
    // Kick off the bundled-JSON preload on profile load — meta is needed
    // for EntityMeta's instant hydration and for CompareTab's candidate
    // pool (loads on tab activation, but starting here gets it earlier).
    entityDataStore.preloadAll();

    let observer: ResizeObserver | null = null;

    function updateHeight() {
      if (!flipContainerRef || !frontRef || !backRef) return;
      const activeEl = view() === "news" ? frontRef : backRef;
      const h = `${activeEl.scrollHeight}px`;
      flipContainerRef.style.minHeight = h;
      if (flipInnerRef) flipInnerRef.style.minHeight = h;
    }

    function connectObserver() {
      if (!frontRef || !backRef) return;
      observer = new ResizeObserver(() => {
        // Skip resize callbacks while the flip animation is running to
        // avoid reading scrollHeight during 3D transforms.
        if (!isFlipping()) updateHeight();
      });
      observer.observe(frontRef);
      observer.observe(backRef);
    }

    function flipTo(target: "news" | "stats") {
      if (target === view()) return;
      setView(target);
      updateViewParam(target);

      // Disconnect observer during the flip, measure target height, animate.
      setIsFlipping(true);
      observer?.disconnect();
      updateHeight();

      // Reconnect after transitionend (with a safety fallback for reduced motion).
      function onTransitionEnd(e: TransitionEvent) {
        if (e.propertyName !== "transform") return;
        flipInnerRef?.removeEventListener("transitionend", onTransitionEnd);
        setIsFlipping(false);
        connectObserver();
        updateHeight();
      }
      flipInnerRef?.addEventListener("transitionend", onTransitionEnd);

      setTimeout(() => {
        if (!isFlipping()) return;
        flipInnerRef?.removeEventListener("transitionend", onTransitionEnd);
        setIsFlipping(false);
        connectObserver();
        updateHeight();
      }, 700);
    }

    connectObserver();
    updateHeight();

    // EntityMeta dispatches profile:viewchange when its toggle is clicked.
    const onViewChange = ((e: CustomEvent) => {
      const v = e.detail.view as "news" | "stats";
      flipTo(v);
    }) as EventListener;
    window.addEventListener("profile:viewchange", onViewChange);

    onCleanup(() => {
      if (isServer) return;
      observer?.disconnect();
      window.removeEventListener("profile:viewchange", onViewChange);
    });
  });

  return (
    <main class="profile-main">
      <EntityMeta type={entityType()} />
      <div class="card-flip-container" ref={flipContainerRef}>
        <div
          class="card-flip-inner"
          classList={{ flipped: view() === "stats" }}
          ref={flipInnerRef}
        >
          <div class="card-flip-front" ref={frontRef}>
            <NewsCard />
          </div>
          <div class="card-flip-back" ref={backRef}>
            <StatsCard entityType={entityType()} />
          </div>
        </div>
      </div>
    </main>
  );
}
