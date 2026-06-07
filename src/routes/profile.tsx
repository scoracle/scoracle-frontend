/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout (two-card stack — locked 2026-05-14):
 *   MetaShell    — entity identity (EntityMeta)
 *   ContentShell — single flat <NavStrip> strip over the entity's Cards
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123        — opens on the default tab
 *   ?sport=NBA&type=player&id=123&tab=X  — opens on the named card
 *
 * Reactive params: sport/type/id are accessors that read the URL search
 * params, published via ProfileContext. Cross-entity navigation is
 * client-side (SearchBar calls navigate()), so the route stays mounted and
 * the Cards' createAsync re-fetch reactively on entity change — no remount.
 * This replaces the old `<Show keyed>`-remount-of-ProfileBody, whose
 * recreate raced during hydration and intermittently blanked direct/
 * shared-link loads (the SSR'd content was correct; the client left an
 * unfilled Suspense <template>).
 *
 * Eager-fire data flow: on mount (and whenever the entity changes) every
 * Card's data call goes out via firePreloads so the active Card's data is
 * warm before its tab is clicked; the per-pane <Suspense> covers the brief
 * in-flight window. Per-entity <title>/<meta>/og land in the initial SSR HTML
 * for crawlers because SSR runs in async mode (entry-server `mode: "async"`),
 * which awaits all resources before flushing.
 */

import { createSignal, createEffect, on, onMount, ErrorBoundary } from "solid-js";
import { useSearchParams, createAsync, type RoutePreloadFuncArgs } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import {
  ProfileContext,
  type ProfileContextValue,
  type ProfileTab,
  type PercentileScope,
  type RatingScope,
  type RateMode,
} from "../contexts/profile";
import type { EntityType } from "../lib/types";
import { deriveInitialTab } from "../lib/utils/profile-tabs";
import ContentShell from "../components/solid/ContentShell";
import { CARD_REGISTRY } from "../components/solid/card-registry";
import EntityMeta, { getEntityMeta } from "../components/solid/EntityMeta";
import GutterAds from "../components/solid/GutterAds";
import { entityDataStore } from "../lib/utils/entity-data-store";
import { buildEntityBlurb } from "../lib/utils/entity-blurb";
import { getSportMeta } from "../lib/data/sport-meta";
import { setSport } from "../stores/sport";
import "./profile.css";

const VALID_SCOPES = ["all", "position", "conference", "division", "league"];
const VALID_RATES = ["default", "per_36", "per_90", "per_game"];

/**
 * Fire every tab's data call against query()'s cache so a tab's payload is in
 * flight (or warm) before the user clicks it. Idempotent: query() dedupes by
 * [name, ...args] hash, so re-calling with the same args is a no-op. Used by
 * both `preload` (hover-warm path) and the route's onMount / entity-change
 * effect (cold-load path).
 *
 * The per-tab preloads come straight from the CARD_REGISTRY, where each tab's
 * preload is co-located with the Card it serves — so the warm query is
 * guaranteed to match what the Card reads via createAsync. `getSportMeta` is
 * the one cross-cutting, non-tab read, so it stays explicit here.
 */
function firePreloads(sport: string, type: EntityType, id: string, season: number | null) {
  if (!sport || !id) return;
  for (const tab of CARD_REGISTRY) {
    if (tab.showFor && !tab.showFor(type)) continue;
    tab.preload(sport, type, id, season);
  }
  void getSportMeta(sport); // shared sport metadata — not tab-specific
}

export function preload({ location }: RoutePreloadFuncArgs) {
  const sp = location.query;
  const sport = (sp.sport ?? "").toString().toLowerCase();
  const type: EntityType = sp.type === "team" ? "team" : "player";
  const id = (sp.id ?? "").toString();
  const rawSeason = (sp.season ?? "").toString();
  const seasonNum = Number(rawSeason);
  const season = Number.isFinite(seasonNum) && seasonNum > 0 ? seasonNum : null;
  firePreloads(sport, type, id, season);
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
  const [searchParams, setSearchParams] = useSearchParams<{
    sport?: string;
    type?: string;
    id?: string;
    tab?: string;
    season?: string;
    scope?: string;
    rate?: string;
  }>();

  // ── Reactive entity params (read the URL; no captured consts, no remount) ──
  const sport = () => (searchParams.sport ?? "").toLowerCase();
  const entityType = (): EntityType => (searchParams.type === "team" ? "team" : "player");
  const id = () => searchParams.id ?? "";

  // Tab state — initial value respects the optional `?tab=` deep-link. Tab
  // clicks don't write the URL, so this is an internal signal; it's reset to
  // the URL's tab when the entity changes (see syncEntity).
  const [activeTab, setActiveTab] = createSignal<ProfileTab>(deriveInitialTab(searchParams.tab));
  const [percentileScope, setPercentileScope] = createSignal<PercentileScope>("all");

  // Season + scope — single source of truth is the URL, so a shared link lands
  // the recipient on the same season/scope and entity-nav resets them for free.
  const season = (): number | null => {
    const raw = searchParams.season;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const setSeason = (next: number | null) =>
    setSearchParams({ season: next == null ? null : String(next) }, { replace: true });

  const scope = (): RatingScope =>
    VALID_SCOPES.includes(searchParams.scope ?? "") ? (searchParams.scope as RatingScope) : "all";
  const setScope = (next: RatingScope) =>
    setSearchParams({ scope: next === "all" ? null : next }, { replace: true });

  const rateMode = (): RateMode =>
    VALID_RATES.includes(searchParams.rate ?? "") ? (searchParams.rate as RateMode) : "default";
  const setRateMode = (next: RateMode) =>
    setSearchParams({ rate: next === "default" ? null : next }, { replace: true });

  const profileCtx: ProfileContextValue = {
    sport,
    type: entityType,
    id,
    activeTab,
    setActiveTab,
    percentileScope,
    setPercentileScope,
    season,
    setSeason,
    scope,
    setScope,
    rateMode,
    setRateMode,
  };

  // Resolve entity meta at the route. Async SSR (entry-server `mode: "async"`)
  // awaits all resources before flushing, so per-entity <title>/<meta>/og land in
  // the initial HTML for crawlers. EntityMeta reads the same query() key — one fetch.
  const meta = createAsync(() => getEntityMeta(sport(), entityType(), id()));

  // Client-side entity sync: pin the header search to this sport, reset the
  // active tab to the URL's tab, and warm every Card's query. Runs on mount and
  // whenever the entity id changes (client-nav keeps the route mounted).
  const syncEntity = () => {
    const s = sport();
    if (!s || !id()) return;
    setSport(s);
    setActiveTab(deriveInitialTab(searchParams.tab));
    firePreloads(s, entityType(), id(), season());
  };
  onMount(() => {
    entityDataStore.preloadAll();
    syncEntity();
  });
  createEffect(on(id, () => syncEntity(), { defer: true }));

  const pageTitle = () => {
    const e = meta();
    return e?.name ? `${e.name} - Scoracle` : "Profile - Scoracle";
  };

  // Per-entity description — original prose from the resolved meta (shared with
  // the visible card blurb); site default before resolution.
  const pageDescription = () => {
    const e = meta();
    return e
      ? buildEntityBlurb({ name: e.name, type: entityType(), sport: sport(), raw: e.raw })
      : "Sports intelligence for NBA, NFL, and Football — stats, news, social sentiment, and AI-powered insights on every player and team.";
  };

  // OG image points at the server-rendered /og/<cardType>/<sport>/<type>/<id>
  // route — crawlers auto-fetch it from the canonical URL. cardType == active tab.
  const ogImageUrl = () =>
    `https://scoracle.com/og/${activeTab()}/${sport()}/${entityType()}/${id()}`;
  const canonicalUrl = () =>
    `https://scoracle.com/profile?sport=${sport().toUpperCase()}&type=${entityType()}&id=${id()}&tab=${activeTab()}`;

  return (
    <ProfileContext.Provider value={profileCtx}>
      <Title>{pageTitle()}</Title>
      <Meta name="description" content={pageDescription()} />
      <Meta property="og:title" content={pageTitle()} />
      <Meta property="og:description" content={pageDescription()} />
      <Meta property="og:url" content={canonicalUrl()} />
      <Meta property="og:image" content={ogImageUrl()} />
      <Meta name="twitter:title" content={pageTitle()} />
      <Meta name="twitter:description" content={pageDescription()} />
      <Meta name="twitter:image" content={ogImageUrl()} />
      <main class="profile-main">
        <EntityMeta />
        <ErrorBoundary fallback={(err, reset) => <CardError err={err} reset={reset} />}>
          <ContentShell />
        </ErrorBoundary>
        <GutterAds />
      </main>
    </ProfileContext.Provider>
  );
}
