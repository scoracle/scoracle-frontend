/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout (two-card stack — locked 2026-05-14):
 *   MetaShell    — entity identity (EntityMeta)
 *   ContentShell — single flat <NavRail> item rail over the entity's Cards
 *
 * URL params:
 *   ?sport=NBA&type=player&id=123        — opens on the default tab
 *   ?sport=NBA&type=player&id=123&tab=X  — opens on the named card
 *
 * ALL profile state lives on the URL, read through the router's
 * `useSearchParams` — including the active tab: tab clicks write `?tab=` with
 * `{ replace: true }` (selection doesn't pollute history; back leaves the
 * page). sport/type/id are reactive accessors published via ProfileContext.
 * Same-route URL updates keep the route mounted and each profile surface
 * (EntityMeta + every Card) re-fetches reactively on entity change.
 *
 * Eager product flow: ContentShell mounts every visible Card through Solid
 * SSR/hydration and each Card owns its own product read via createAsync +
 * query() — query() dedupes, so no extra warm pass exists or is needed.
 * Per-entity <title>/<meta>/og land in the initial SSR HTML because SSR runs
 * in async mode (entry-server `mode: "async"`), which waits for suspending
 * route work before flushing.
 */

import { createEffect, on, onMount, ErrorBoundary } from "solid-js";
import { createAsync, useSearchParams, type RoutePreloadFuncArgs } from "@solidjs/router";
import { MetaProvider, Title, Meta } from "@solidjs/meta";
import {
  ProfileContext,
  type ProfileContextValue,
  type ProfileTab,
  type RatingScope,
  type RateMode,
  type ScoreModel,
  type NewsFacet,
  type NewsScope,
} from "../contexts/profile";
import type { EntityType } from "../lib/types";
import { deriveInitialTab, DEFAULT_TAB } from "../lib/utils/profile-tabs";
import ContentShell from "../components/solid/ContentShell";
import EntityMeta, { resolveEntityMeta } from "../components/solid/EntityMeta";
import GutterAds from "../components/solid/GutterAds";
import { getSportMetaMaps } from "../lib/data/entity-directory";
import { buildEntityBlurb } from "../lib/utils/entity-blurb";
import { setSport } from "../stores/sport";
import { paramValue } from "../lib/utils/search-params";
import "./profile.css";

const VALID_SCOPES = ["all", "position", "conference", "division", "league"];
const VALID_RATES = ["default", "per_36", "per_90", "per_game", "per_season"];
const VALID_MODELS = ["regular", "fantasy"];
const VALID_NEWS_SCOPES = ["current_week", "last_week", "two_weeks_ago", "three_weeks_ago", "last_month"];

export function preload({ location }: RoutePreloadFuncArgs) {
  const sp = location.query;
  const sport = (sp.sport ?? "").toString().toLowerCase();
  // Warm the sport's meta maps so resolveEntityMeta (title/description + the
  // meta card) resolves without a second asset read.
  if (sport) getSportMetaMaps(sport).catch(() => {});
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
  const [searchParams, setSearchParams] = useSearchParams();
  // Router params are `string | string[] | undefined`; every read wants the
  // single-string view.
  const sp = (key: string) => paramValue(searchParams[key]);

  // ── Reactive entity params (read the URL; no captured consts, no remount) ──
  const sport = () => (sp("sport") ?? "").toLowerCase();
  const entityType = (): EntityType => (sp("type") === "team" ? "team" : "player");
  const id = () => sp("id") ?? "";

  // Active tab — URL-owned like every other piece of profile state. Selection
  // uses { replace: true } (tab clicks don't stack history entries); the
  // default tab keeps the URL clean by dropping the param.
  const activeTab = (): ProfileTab => deriveInitialTab(sp("tab"));
  const setActiveTab = (next: ProfileTab) =>
    setSearchParams({ tab: next === DEFAULT_TAB ? null : next }, { replace: true });

  // News facet — Narratives or Transfers/Trades. `?newsScope=transfers` is an
  // old deep-link shape; keep it landing on the transfer facet without calling
  // the retired Headlines route.
  const newsFacet = (): NewsFacet => {
    const raw = sp("newsView") ?? sp("newsScope");
    return raw === "transfers" ? "transfers" : "narratives";
  };
  const setNewsFacet = (next: NewsFacet) =>
    setSearchParams({
      newsView: next === "narratives" ? null : next,
      newsScope:
        sp("newsScope") === "transfers" || sp("newsScope") === "headlines"
          ? null
          : sp("newsScope") ?? null,
    }, { replace: true });

  // News historical scope — shared by narratives and Transfers/Trades. Default
  // current_week; URL param maps directly to backend `scope=`.
  const newsScope = (): NewsScope =>
    VALID_NEWS_SCOPES.includes(sp("newsScope") ?? "")
      ? (sp("newsScope") as NewsScope)
      : "current_week";
  const setNewsScope = (next: NewsScope) =>
    setSearchParams({
      newsView:
        sp("newsScope") === "transfers" && !sp("newsView")
          ? "transfers"
          : sp("newsView") ?? null,
      newsScope: next === "current_week" ? null : next,
    }, { replace: true });

  // Season + scope — single source of truth is the URL, so a shared link lands
  // the recipient on the same season/scope and entity-nav resets them for free.
  const season = (): number | null => {
    const raw = sp("season");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const setSeason = (next: number | null) =>
    setSearchParams({ season: next == null ? null : String(next) }, { replace: true });

  const scope = (): RatingScope =>
    VALID_SCOPES.includes(sp("scope") ?? "") ? (sp("scope") as RatingScope) : "all";
  const setScope = (next: RatingScope) =>
    setSearchParams({ scope: next === "all" ? null : next }, { replace: true });

  const rateMode = (): RateMode =>
    VALID_RATES.includes(sp("rate") ?? "") ? (sp("rate") as RateMode) : "default";
  const setRateMode = (next: RateMode) =>
    setSearchParams({ rate: next === "default" ? null : next }, { replace: true });

  const scoreModel = (): ScoreModel =>
    VALID_MODELS.includes(sp("model") ?? "") ? (sp("model") as ScoreModel) : "regular";
  const setScoreModel = (next: ScoreModel) =>
    setSearchParams({ model: next === "regular" ? null : next }, { replace: true });

  const vs = (): string | null => sp("vs") ?? null;
  const setVs = (next: string | null) =>
    setSearchParams({ vs: next || null }, { replace: true });

  const profileCtx: ProfileContextValue = {
    sport,
    type: entityType,
    id,
    activeTab,
    setActiveTab,
    season,
    setSeason,
    scope,
    setScope,
    rateMode,
    setRateMode,
    scoreModel,
    setScoreModel,
    vs,
    setVs,
    newsFacet,
    setNewsFacet,
    newsScope,
    setNewsScope,
  };

  // Resolve entity meta at the route. Async SSR (entry-server `mode: "async"`)
  // awaits all resources before flushing, so per-entity <title>/<meta>/og land in
  // the initial HTML for crawlers. This uses the raw bundled-meta resolver:
  // route preload can run before router query context exists, while the metadata
  // itself is a static asset read and does not need query() cache semantics.
  const meta = createAsync(() => resolveEntityMeta(sport(), entityType(), id()));

  // Client-side entity sync: pin the header search to this sport. (The active
  // tab needs no reset — it reads the URL, which each navigation replaces.)
  const syncEntity = () => {
    const s = sport();
    if (!s || !id()) return;
    setSport(s);
  };
  const entityKey = () => `${sport()}|${entityType()}|${id()}`;
  onMount(() => syncEntity());
  createEffect(on(entityKey, () => syncEntity(), { defer: true }));

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
  // route — crawlers auto-fetch it from the canonical URL. cardType == active tab,
  // except an active comparison on Composite → the `compare` (butterfly) card.
  // Per-X mode / cohort scope / compare-target ride the query so the shared card
  // matches what the viewer saw.
  const ogImageUrl = () => {
    const vsId = vs();
    const onStats = activeTab() === "stats";
    const card = vsId && onStats ? "compare" : activeTab();
    const p = new URLSearchParams();
    if (rateMode() !== "default") p.set("rate", rateMode());
    if (scope() !== "all") p.set("scope", scope());
    if (vsId && onStats) p.set("vs", vsId);
    const qs = p.toString();
    return `https://scoracle.com/og/${card}/${sport()}/${entityType()}/${id()}${qs ? `?${qs}` : ""}`;
  };
  const canonicalUrl = () =>
    `https://scoracle.com/profile?sport=${sport().toUpperCase()}&type=${entityType()}&id=${id()}&tab=${activeTab()}`;

  return (
    <>
      <MetaProvider>
        <Title>{pageTitle()}</Title>
        <Meta name="description" content={pageDescription()} />
        <Meta property="og:title" content={pageTitle()} />
        <Meta property="og:description" content={pageDescription()} />
        <Meta property="og:url" content={canonicalUrl()} />
        <Meta property="og:image" content={ogImageUrl()} />
        <Meta name="twitter:title" content={pageTitle()} />
        <Meta name="twitter:description" content={pageDescription()} />
        <Meta name="twitter:image" content={ogImageUrl()} />
      </MetaProvider>

      <ProfileContext.Provider value={profileCtx}>
        <main class="profile-main">
          <EntityMeta />
          <ErrorBoundary fallback={(err, reset) => <CardError err={err} reset={reset} />}>
            <ContentShell />
          </ErrorBoundary>
          <GutterAds />
        </main>
      </ProfileContext.Provider>
    </>
  );
}
