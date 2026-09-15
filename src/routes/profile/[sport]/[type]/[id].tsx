import { profileReads, ProfileReadsContext, preloadProfile, useProfileRead } from "../../../../lib/data/profile-data";
/**
 * Profile route — unified entity profile (player or team).
 *
 * Layout (two-card stack — locked 2026-05-14):
 *   EntityMeta   — entity identity (the meta card)
 *   ReadingTable — single flat <NavWell> tab rail over the entity's Cards
 *
 * URL shape (path-based since 2026-07-18 — see lib/utils/profile-url.ts):
 *   /profile/nba/player/177-aaron-gordon        — opens on the default tab
 *   /profile/nba/player/177-aaron-gordon?tab=X  — opens on the named card
 *
 * Entity identity (sport/type/id) lives in the PATH; the slug after the id is
 * display sugar only (routing keys on the leading numeric id). Everything
 * else — the active tab included — stays URL-owned via `useSearchParams`:
 * tab clicks write `?tab=` with `{ replace: true }` (selection doesn't
 * pollute history; back leaves the page). sport/type/id are reactive
 * accessors published via ProfileContext. Same-route URL updates keep the
 * route mounted and each profile surface (EntityMeta + every Card)
 * re-fetches reactively on entity change.
 *
 * Unknown sports/types or non-numeric ids render the 404 card with a real
 * 404 status — never an empty deck.
 *
 * Eager product flow: ReadingTable mounts every visible Card through Solid
 * SSR/hydration and each Card owns its own product read via createMemo +
 * query() — query() dedupes, so no extra warm pass exists or is needed.
 * Per-entity <title>/<meta>/og land in the initial SSR HTML because SSR runs
 * in async mode (entry-server awaits renderToStream), which waits for suspending
 * route work before flushing.
 */
import { createMemo, createEffect, onSettled, Errored, Show, Loading } from "solid-js";
import { isServer } from "@solidjs/web";
import { revalidate, useParams, useSearchParams, type RoutePreloadFuncArgs } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import HttpStatusCode from "../../../../components/HttpStatusCode";
import { ProfileContext, type ProfileContextValue, type ProfileTab, type RatingScope, type RateMode, type ScoreModel, type NewsScope, } from "../../../../contexts/profile";
import type { EntityType } from "../../../../lib/types";
import { deriveInitialTab, DEFAULT_TAB } from "../../../../lib/utils/profile-tabs";
import ReadingTable from "../../../../components/solid/ReadingTable";
import LoadingCard from "../../../../components/solid/LoadingCard";
import EntityMeta, { EntityMetaSkeleton } from "../../../../components/solid/EntityMeta";
import GutterAds from "../../../../components/solid/GutterAds";
import PageAtmosphere from "../../../../components/solid/PageAtmosphere";
import { buildEntityBlurb } from "../../../../lib/utils/entity-blurb";
import { setSport } from "../../../../stores/sport";
import { paramValue } from "../../../../lib/utils/search-params";
import { parseWeekKey } from "../../../../lib/utils/week";
import { isProfileSport, parseEntityIdParam, profilePath, } from "../../../../lib/utils/profile-url";
import "../../../legal.css";
import "../../../profile.css";
const VALID_SCOPES = ["all", "position", "conference", "division", "league"];
const VALID_RATES = ["default", "per_36", "per_90", "per_game", "per_season"];
const VALID_MODELS = ["regular", "fantasy"];
const VALID_NEWS_SCOPES = ["current_week", "last_week", "two_weeks_ago", "three_weeks_ago", "last_month"];
export function preload({ params, location, intent }: RoutePreloadFuncArgs) {
    // SSR resolves metadata directly; serializing the complete maps is costly.
    if (isServer || intent === "initial")
        return;
    const sport = (params.sport ?? "").toLowerCase();
    const id = parseEntityIdParam(params.id);
    if (!isProfileSport(sport) || !id || !["player", "team"].includes(params.type ?? ""))
        return;
    const type = params.type as EntityType;
    const search = new URLSearchParams(location.search);
    const rawSeason = Number(search.get("season"));
    const season = Number.isFinite(rawSeason) && rawSeason > 0 ? rawSeason : null;
    const newsScope = VALID_NEWS_SCOPES.includes(search.get("newsScope") ?? "")
        ? search.get("newsScope") as NewsScope : "current_week";
    const week = parseWeekKey(search.get("week"));
    preloadProfile({ sport: () => sport, type: () => type, id: () => id,
        season: () => season, newsScope: () => newsScope, week: () => week ? search.get("week") : null,
        vs: () => search.get("vs") });
}
function ProfileAtmosphere() {
    const palette = useProfileRead("palette");
    return <PageAtmosphere palette={palette() ?? undefined}/>;
}
function CardError(props: {
    err: unknown;
    reset: () => void;
}) {
    const message = props.err instanceof Error ? props.err.message : String(props.err);
    return (<div class="card-error" role="alert">
      <p class="card-error-title">Couldn't load this profile.</p>
      <p class="card-error-detail">{message}</p>
      <button type="button" class="card-error-retry" onClick={() => { revalidate(); props.reset(); }}>
        Try again
      </button>
    </div>);
}
/** Malformed profile path (unknown sport/type, slug without an id): a real
 *  404 — same voice as routes/[...404].tsx — instead of an empty deck. */
function ProfileNotFound() {
    return (<main class="legal-main notfound-main">
      <HttpStatusCode code={404}/>
      <Title>Not found - Scoracle</Title>
      <h1>Profile not found</h1>
      <p>There's no player or team at this address.</p>
      <p>
        <a href="/profile">Browse profiles</a> or <a href="/">back to home</a>
      </p>
    </main>);
}
export default function Profile() {
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    // Router search params are `string | string[] | undefined`; every read
    // wants the single-string view.
    const sp = (key: string) => paramValue(searchParams[key]);
    // ── Reactive entity params (read the PATH; no captured consts, no remount) ──
    const sport = () => (params.sport ?? "").toLowerCase();
    const entityType = (): EntityType => (params.type === "team" ? "team" : "player");
    const id = () => parseEntityIdParam(params.id) ?? "";
    const validPath = () => isProfileSport(sport()) &&
        (params.type === "player" || params.type === "team") &&
        id() !== "";
    // Active tab — URL-owned like every other piece of profile state. Selection
    // uses { replace: true } (tab clicks don't stack history entries); the
    // default tab keeps the URL clean by dropping the param. The retired
    // `?newsView=` facet (and the even older `?newsScope=transfers` shape) feeds
    // deriveInitialTab so old News-hub facet deep links land on the facet's real
    // card (Transfers / Vibe are peers since Characters Phase 1).
    const activeTab = (): ProfileTab => deriveInitialTab(sp("tab"), sp("newsView") ?? sp("newsScope"));
    const setActiveTab = (next: ProfileTab) => setSearchParams({
        tab: next === DEFAULT_TAB ? null : next,
        // Drop retired facet params on every tab change — a lingering
        // `?newsView=transfers` would re-promote the tab on the next derive
        // and pin the old deep link. Legacy facet values in `newsScope`
        // ("transfers"/"headlines") clear the same way; real time scopes stay.
        newsView: null,
        newsScope: VALID_NEWS_SCOPES.includes(sp("newsScope") ?? "")
            ? sp("newsScope")
            : null,
    }, { replace: true });
    // News historical scope — shared by Narratives and Transfers/Trades. Default
    // current_week; URL param maps directly to backend `scope=`.
    const newsScope = (): NewsScope => VALID_NEWS_SCOPES.includes(sp("newsScope") ?? "")
        ? (sp("newsScope") as NewsScope)
        : "current_week";
    const setNewsScope = (next: NewsScope) => setSearchParams({ newsScope: next === "current_week" ? null : next }, { replace: true });
    // Card body posture for the chart cards — text is the resting state; the
    // graph is one scope flip away.
    // Season + scope — single source of truth is the URL, so a shared link lands
    // the recipient on the same season/scope and entity-nav resets them for free.
    const season = (): number | null => {
        const raw = sp("season");
        if (!raw)
            return null;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    };
    const setSeason = (next: number | null) => setSearchParams({ season: next == null ? null : String(next) }, { replace: true });
    const scope = (): RatingScope => VALID_SCOPES.includes(sp("scope") ?? "") ? (sp("scope") as RatingScope) : "all";
    const setScope = (next: RatingScope) => setSearchParams({ scope: next === "all" ? null : next }, { replace: true });
    const rateMode = (): RateMode => VALID_RATES.includes(sp("rate") ?? "") ? (sp("rate") as RateMode) : "default";
    const setRateMode = (next: RateMode) => setSearchParams({ rate: next === "default" ? null : next }, { replace: true });
    const scoreModel = (): ScoreModel => VALID_MODELS.includes(sp("model") ?? "") ? (sp("model") as ScoreModel) : "regular";
    const setScoreModel = (next: ScoreModel) => setSearchParams({ model: next === "regular" ? null : next }, { replace: true });
    const vs = (): string | null => sp("vs") ?? null;
    const setVs = (next: string | null) => setSearchParams({ vs: next || null }, { replace: true });
    // The rail's time axis (week-archive convention, 2026-08-24): absent = the
    // live cards (the dropdown wears the current week's name); "YYYY-N" = that
    // Jan-1-anchored week's merged archive. Garbage
    // parses to live rather than erroring — a stale share link lands live.
    const week = (): string | null => {
        const raw = sp("week");
        return parseWeekKey(raw) ? raw! : null;
    };
    const setWeek = (next: string | null) => setSearchParams({ week: next || null }, { replace: true });
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
        newsScope,
        setNewsScope,
        week,
        setWeek,
    };
    // Resolve entity meta at the route. Async SSR (entry-server awaits renderToStream)
    // awaits all resources before flushing, so per-entity <title>/<meta>/og land in
    // the initial HTML for crawlers. Share one narrowed server query across
    // preload, route head, identity card, and recent navigation.
    const reads = profileReads(profileCtx);
    const meta = createMemo(() => validPath() ? reads.meta() : null);
    // Client-side entity sync: pin the header search to this sport. (The active
    // tab needs no reset — it reads the URL, which each navigation replaces.)
    const syncEntity = () => {
        const s = sport();
        if (!s || !id())
            return;
        setSport(s);
    };
    const entityKey = () => `${sport()}|${entityType()}|${id()}`;
    onSettled(() => syncEntity());
    createEffect(() => ({ sport: sport(), id: id() }), value => { if (value.sport && value.id)
        setSport(value.sport); }, { defer: true });
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
    // Canonical: the slugged path form; `?tab=` only when off the default so
    // one entity doesn't index as N near-duplicate canonicals.
    const canonicalUrl = () => {
        const path = profilePath(sport(), entityType(), id(), {
            name: meta()?.name,
            tab: activeTab() === DEFAULT_TAB ? undefined : activeTab(),
        });
        return `https://scoracle.com${path}`;
    };
    return (<Show when={validPath()} fallback={<ProfileNotFound />}>
      <>
        <Title>{pageTitle()}</Title>
        <Meta name="description" content={pageDescription()}/>
        <Meta property="og:title" content={pageTitle()}/>
        <Meta property="og:description" content={pageDescription()}/>
        <Meta property="og:url" content={canonicalUrl()}/>
        <Meta name="twitter:title" content={pageTitle()}/>
        <Meta name="twitter:description" content={pageDescription()}/>
      </>

      <ProfileContext value={profileCtx}><ProfileReadsContext value={reads}>
        <main class="profile-main">
          {/* Meta-card-first reveal: ONE Loading over EntityMeta + ReadingTable.
        EntityMeta's resolveEntityMeta read suspends to this boundary (its
        internal boundary was removed), so on client-side navigation the
        meta content and the pane skeletons paint together, in final
        position — no shove-down when meta lands. Pane-level boundaries
        inside ReadingTable still catch every card's product read, so this
        boundary's long pole is entity meta (bundled JSON — fast) and all
        product fetches stay parallel. */}
          {/* Solid 2 scopes fallback to entity identity without remounting
            the route. Tab and condition changes retain their card state. */}
            <Loading on={entityKey()} fallback={<PageAtmosphere />}>
              <ProfileAtmosphere />
            </Loading>
            <Loading on={entityKey()} fallback={<div class="profile-deck">
                  <EntityMetaSkeleton />
                  {/* The deck's seat, held from the first frame: the pane
    column is what `.profile-deck:has(.reading-table-deck)`
    keys the wide spread off (profile.css), so reserving it
    here keeps the meta card in its spread position instead
    of centering alone and jumping left when the deck
    lands. */}
                  <div class="reading-table-deck">
                    <LoadingCard label="Reading"/>
                  </div>
                </div>}>
              {/* The deck: TWO portrait cards reading as one playing card —
meta on the left (the card's "top"), content on the right —
with the NavWell tray centered below both. Narrow viewports
stack meta → tray → card. The share artifact composes the
two (<ShadowCard>). Layout in profile.css. */}
              <div class="profile-deck">
                <EntityMeta />
                <Errored fallback={(err, reset) => <CardError err={err()} reset={reset}/>}>
                  <ReadingTable />
                </Errored>
              </div>
            </Loading>
          <GutterAds />
        </main>
      </ProfileReadsContext></ProfileContext>
    </Show>);
}
