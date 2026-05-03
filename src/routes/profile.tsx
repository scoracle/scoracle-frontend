/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout:
 *   EntityMeta (top — pure meta widget, no UI state)
 *   ProfileCard (mode toggle on top + sub-tabs below)
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123  — opens on News mode default
 *
 * Eager-fire data flow: as soon as the route knows the entity (preload
 * on hover, or onMount on cold-load), every active tab's data call goes
 * out — news, stats, vibe, twitter, sport-meta. By the time the user
 * clicks any tab, its data is in flight or warm in query() cache. The
 * tab's per-component <Suspense> (provided by TabContainer via
 * TabDef.fallback) covers the brief in-flight window.
 *
 * Co-mentions is currently disconnected from the UI; getEntities is
 * therefore not preloaded. Re-enabling is one line in ProfileCard's
 * newsTabs and one line in firePreloads.
 */

import { Show, createSignal, createEffect, onMount, ErrorBoundary } from "solid-js";
import { isServer } from "solid-js/web";
import { useSearchParams, type RoutePreloadFuncArgs } from "@solidjs/router";
import { useStore } from "@nanostores/solid";
import { ProfileContext, type ProfileContextValue } from "../contexts/profile";
import EntityMeta from "../components/solid/EntityMeta";
import ProfileCard from "../components/solid/ProfileCard";
import { $entityInfo } from "../stores/entity";
import { entityDataStore } from "../lib/utils/entity-data-store";
import { getNews } from "../lib/data/news.server";
import { getStats } from "../lib/data/stats.server";
import { getVibe } from "../lib/data/vibe.server";
import { getTwitterFeed } from "../lib/data/twitter.server";
import { getSportMeta } from "../lib/data/sport-meta";
import "./profile.css";

/**
 * Fire every tab's data call against query()'s cache. Idempotent:
 * query() dedupes by [name, ...args] hash, so re-calling with the same
 * args is a no-op. Used by both `preload` (hover-warm path) and the
 * route's `onMount` (cold-load path).
 */
function firePreloads(sport: string, type: "player" | "team", id: string) {
  if (!sport || !id) return;
  void getNews(sport, type, id);
  void getStats(sport, type, id);
  void getVibe(sport, type, id);
  void getTwitterFeed(sport, type, id, 20);
  void getSportMeta(sport);
  // getEntities (co-mentions entity directory) is intentionally not
  // preloaded — co-mentions is currently disabled in ProfileCard. Add
  // `void getEntities(sport)` here when the tab returns.
}

export function preload({ location }: RoutePreloadFuncArgs) {
  const sp = location.query;
  const sport = (sp.sport ?? "").toString().toLowerCase();
  const type = sp.type === "team" ? "team" : "player";
  const id = (sp.id ?? "").toString();
  firePreloads(sport, type, id);
}

function CardError(props: { err: unknown; reset: () => void }) {
  const message = props.err instanceof Error ? props.err.message : String(props.err);
  return (
    <div class="card-error" role="alert">
      <p class="card-error-title">Couldn't load this profile.</p>
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
  }>();

  const routeKey = () =>
    `${searchParams.sport ?? ""}|${searchParams.type ?? ""}|${searchParams.id ?? ""}`;

  return (
    <Show when={routeKey()} keyed>
      {(_key: string) => <ProfileBody />}
    </Show>
  );
}

function ProfileBody() {
  const [searchParams] = useSearchParams<{
    sport?: string;
    type?: string;
    id?: string;
  }>();

  const sport = (searchParams.sport ?? "").toLowerCase();
  const entityType: "player" | "team" =
    searchParams.type === "team" ? "team" : "player";
  const id = searchParams.id ?? "";

  const profileCtx: ProfileContextValue = {
    sport,
    type: entityType,
    id,
  };

  const entity = useStore($entityInfo);

  createEffect(() => {
    const e = entity();
    if (!isServer && e?.name) {
      document.title = `${e.name} - Scoracle`;
    }
  });

  onMount(() => {
    entityDataStore.preloadAll();
    firePreloads(sport, entityType, id);
  });

  return (
    <ProfileContext.Provider value={profileCtx}>
      <main class="profile-main">
        <EntityMeta />
        <ErrorBoundary fallback={(err, reset) => <CardError err={err} reset={reset} />}>
          <ProfileCard />
        </ErrorBoundary>
      </main>
    </ProfileContext.Provider>
  );
}
