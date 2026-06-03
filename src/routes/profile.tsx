/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout (two-card stack — locked 2026-05-14):
 *   MetaShell    — entity identity (EntityMeta)
 *   ContentShell — single flat <NavStrip> strip over five sibling Cards
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123        — opens on stats default
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
 * Co-mentions has no live consumer — the Mentions section inside
 * TrendsCard was disconnected 2026-05-24 alongside Stats / Record so
 * TrendsCard could focus on the Rating + Vibes sparklines. `getEntities`
 * is no longer preloaded; revive the `void getEntities(sport);` line
 * here if a mentions surface comes back.
 */

import { Show, createSignal, onMount, ErrorBoundary } from "solid-js";
import { useSearchParams, createAsync, type RoutePreloadFuncArgs } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import {
  ProfileContext,
  type ProfileContextValue,
  type ProfileTab,
  type PercentileScope,
  type RatingScope,
} from "../contexts/profile";
import { deriveInitialTab } from "../lib/utils/profile-tabs";
// EntityMeta and ContentShell each render their own <Shell>; the
// corner-label slot is set by each Card via the static `cornerLabel`
// prop, so the route doesn't pipe anything corner-related through
// ProfileContext.
import ContentShell from "../components/solid/ContentShell";
import { PROFILE_TABS } from "../components/solid/profile-tabs";
import EntityMeta, { getEntityMeta } from "../components/solid/EntityMeta";
import GutterAds from "../components/solid/GutterAds";
import { entityDataStore } from "../lib/utils/entity-data-store";
import { buildEntityBlurb } from "../lib/utils/entity-blurb";
import { getSportMeta } from "../lib/data/sport-meta";
import "./profile.css";

/**
 * Fire every tab's data call against query()'s cache so a tab's payload is in
 * flight (or warm) before the user clicks it. Idempotent: query() dedupes by
 * [name, ...args] hash, so re-calling with the same args is a no-op. Used by
 * both `preload` (hover-warm path) and the route's `onMount` (cold-load path).
 *
 * The per-tab preloads come straight from the PROFILE_TABS registry, where
 * each tab's preload is co-located with the Card it serves — so the warm query
 * is guaranteed to match what the Card reads via createAsync (same fn + same
 * args = same query() cache key). `getSportMeta` is the one cross-cutting,
 * non-tab read, so it stays explicit here.
 */
function firePreloads(sport: string, type: "player" | "team", id: string, season: number | null) {
  if (!sport || !id) return;
  // Only warm tabs that will actually render for this entity type (Roster is
  // team-only) — same gate ContentShell uses for the nav + panes.
  for (const tab of PROFILE_TABS) {
    if (tab.showFor && !tab.showFor(type)) continue;
    tab.preload(sport, type, id, season);
  }
  void getSportMeta(sport); // shared sport metadata — not tab-specific
}

export function preload({ location }: RoutePreloadFuncArgs) {
  const sp = location.query;
  const sport = (sp.sport ?? "").toString().toLowerCase();
  const type = sp.type === "team" ? "team" : "player";
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
  const [searchParams, setSearchParams] = useSearchParams<{
    sport?: string;
    type?: string;
    id?: string;
    tab?: string;
    season?: string;
    scope?: string;
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

  // Season state — initial value comes from `?season=N` so a shared URL
  // lands the recipient on the same season the sender was viewing. `null`
  // means "let the backend pick the latest". The setter syncs back to
  // the URL via setSearchParams so reload + share survive selection.
  const parsedSeason = (() => {
    const raw = searchParams.season;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const [season, setSeasonSignal] = createSignal<number | null>(parsedSeason);
  const setSeason = (next: number | null) => {
    setSeasonSignal(next);
    setSearchParams({ season: next == null ? null : String(next) }, { replace: true });
  };

  // Rating scope (cohort re-rank) — URL-synced via ?scope= (mirrors season).
  const VALID_SCOPES = ["all", "position", "conference", "division", "league"];
  const parsedScope: RatingScope = VALID_SCOPES.includes(searchParams.scope ?? "")
    ? (searchParams.scope as RatingScope)
    : "all";
  const [scope, setScopeSignal] = createSignal<RatingScope>(parsedScope);
  const setScope = (next: RatingScope) => {
    setScopeSignal(next);
    setSearchParams({ scope: next === "all" ? null : next }, { replace: true });
  };

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
  };

  // Resolve entity meta at the route. `deferStream` makes SSR await this
  // fast, backend-free static read before flushing the head, so per-entity
  // <title>/<meta>/og land in the initial HTML for crawlers + social cards.
  // EntityMeta reads the same query() key — one shared fetch, no refetch.
  const meta = createAsync(() => getEntityMeta(sport, entityType, id), {
    deferStream: true,
  });

  onMount(() => {
    entityDataStore.preloadAll();
    firePreloads(sport, entityType, id, season());
  });

  const pageTitle = () => {
    const e = meta();
    return e?.name ? `${e.name} - Scoracle` : "Profile - Scoracle";
  };

  // Per-entity description — original prose generated from the resolved meta
  // (shared with the visible card blurb); site default before resolution.
  const pageDescription = () => {
    const e = meta();
    return e
      ? buildEntityBlurb({ name: e.name, type: entityType, sport, raw: e.raw })
      : "Sports intelligence for NBA, NFL, and Football — stats, news, social sentiment, and AI-powered insights on every player and team.";
  };

  // OG image points at the server-rendered /og/<cardType>/<sport>/<type>/<id>
  // route — social crawlers (X / FB / iMessage / Discord) auto-fetch this
  // when users share the canonical profile URL. cardType maps from the
  // active tab; falls back to "vibe" for any tab without a real artifact
  // (the OG route renders a placeholder for unwired card types).
  const cardTypeForTab = () => {
    const tab = activeTab();
    if (tab === "vibes") return "vibe";
    return tab; // non-vibe tabs render OG placeholders today
  };
  const ogImageUrl = () =>
    `https://scoracle.com/og/${cardTypeForTab()}/${sport}/${entityType}/${id}`;
  const canonicalUrl = () =>
    `https://scoracle.com/profile?sport=${sport.toUpperCase()}&type=${entityType}&id=${id}&tab=${activeTab()}`;

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
