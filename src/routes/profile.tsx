/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout (two-card stack — locked 2026-05-14):
 *   MetaShell    — entity identity (EntityMeta)
 *   ContentShell — single flat <NavStrip> strip over six sibling Cards
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123        — opens on news default
 *   ?sport=NBA&type=player&id=123&tab=X  — opens on the named card
 *
 * Tab state lives at this route and is published via ProfileContext as
 * a single `activeTab` signal. ContentShell renders the NavStrip strip
 * and the active card pane.
 *
 * Eager-fire data flow: as soon as the route knows the entity (preload
 * on hover, or onMount on cold-load), every Card's data call goes
 * out — news, stats, vibe, twitter, sport-meta. By the time the user
 * clicks any tab, the active Card's data is in flight or warm in
 * query() cache. The Card's per-pane <Suspense> covers the brief
 * in-flight window.
 *
 * Co-mentions is currently disconnected from the UI; getEntities is
 * therefore not preloaded. Re-enabling adds it back as a ProfileTab
 * member and a `void getEntities(sport)` line in firePreloads.
 */

import { Show, createSignal, onMount, ErrorBoundary } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { useSearchParams, type RoutePreloadFuncArgs } from "@solidjs/router";
import { useStore } from "@nanostores/solid";
import { Title, Meta } from "@solidjs/meta";
import {
  ProfileContext,
  type ProfileContextValue,
  type ProfileTab,
  type PercentileScope,
} from "../contexts/profile";
import { deriveInitialTab } from "../lib/utils/profile-tabs";
// EntityMeta and ContentShell each render their own <Shell>; the
// corner-label slot is set by each Card via the static `cornerLabel`
// prop, so the route doesn't pipe anything corner-related through
// ProfileContext.
import ContentShell from "../components/solid/ContentShell";
import GutterAds from "../components/solid/GutterAds";

// EntityMeta is wrapped with clientOnly per the project's CLAUDE.md
// convention (components that read URL params or rely on browser-only state
// like bundled-JSON fetch should not SSR).
const EntityMeta = clientOnly(() => import("../components/solid/EntityMeta"));
// EntityMetaSkeleton is imported synchronously so it can render on the
// server as `clientOnly`'s `fallback` — that reserves the locked Shell
// silhouette in SSR HTML, killing the ~370 px hydration pop-in the
// MetaShell used to cause.
import EntityMetaSkeleton from "../components/solid/EntityMetaSkeleton";
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
  // preloaded — co-mentions is currently disabled. Add `void getEntities(sport)`
  // here when the tab returns.
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
    tab?: string;
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
    tab?: string;
  }>();

  const sport = (searchParams.sport ?? "").toLowerCase();
  const entityType: "player" | "team" =
    searchParams.type === "team" ? "team" : "player";
  const id = searchParams.id ?? "";

  // Tab state — read + written by ContentShell's NavStrip via ProfileContext.
  // The initial value respects the optional `?tab=` deep-link param so a
  // shared URL lands the recipient on the same Card the sender shared.
  const [activeTab, setActiveTab] = createSignal<ProfileTab>(
    deriveInitialTab(searchParams.tab),
  );
  const [percentileScope, setPercentileScope] = createSignal<PercentileScope>("all");

  const profileCtx: ProfileContextValue = {
    sport,
    type: entityType,
    id,
    activeTab,
    setActiveTab,
    percentileScope,
    setPercentileScope,
  };

  const entity = useStore($entityInfo);

  onMount(() => {
    entityDataStore.preloadAll();
    firePreloads(sport, entityType, id);
  });

  // Page title — defers to the entity name once $entityInfo resolves
  // client-side (EntityMeta populates the store); falls back to a generic
  // "Profile - Scoracle" for SSR + cold loads.
  const pageTitle = () => {
    const e = entity();
    return e?.name ? `${e.name} - Scoracle` : "Profile - Scoracle";
  };

  // OG image points at the server-rendered /og/<cardType>/<sport>/<type>/<id>
  // route — social crawlers (X / FB / iMessage / Discord) auto-fetch this
  // when users share the canonical profile URL. cardType maps from the
  // active tab; falls back to "vibe" for any tab without a real artifact
  // (the OG route renders a placeholder for unwired card types).
  const cardTypeForTab = () => {
    const tab = activeTab();
    if (tab === "vibes") return "vibe";
    return tab; // news/x/stats/traits/compare — placeholders today
  };
  const ogImageUrl = () =>
    `https://scoracle.com/og/${cardTypeForTab()}/${sport}/${entityType}/${id}`;
  const canonicalUrl = () =>
    `https://scoracle.com/profile?sport=${sport.toUpperCase()}&type=${entityType}&id=${id}&tab=${activeTab()}`;

  return (
    <ProfileContext.Provider value={profileCtx}>
      <Title>{pageTitle()}</Title>
      <Meta property="og:title" content={pageTitle()} />
      <Meta property="og:url" content={canonicalUrl()} />
      <Meta property="og:image" content={ogImageUrl()} />
      <Meta name="twitter:title" content={pageTitle()} />
      <Meta name="twitter:image" content={ogImageUrl()} />
      <main class="profile-main">
        <EntityMeta fallback={<EntityMetaSkeleton />} />
        <ErrorBoundary fallback={(err, reset) => <CardError err={err} reset={reset} />}>
          <ContentShell />
        </ErrorBoundary>
        <GutterAds />
      </main>
    </ProfileContext.Provider>
  );
}
