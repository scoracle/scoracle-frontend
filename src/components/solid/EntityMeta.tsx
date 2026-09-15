import { useProfileReads, useProfileRead } from "../../lib/data/profile-data";
/**
 * EntityMeta — Unified player/team meta widget (Solid.js)
 *
 * Reads sport/type/id from ProfileContext. Pure meta-display widget —
 * no UI state, no toggle. EntityMeta is the meta card in the profile stack;
 * tab navigation and card panes live in ReadingTable, not here.
 *
 * Data flow: same `createMemo` / `query()` shape as the rest of the
 * platform. `getEntityMeta` reads the bundled meta JSON (Workers Static
 * Assets — no Go-API round-trip) and resolves on BOTH server and client.
 * Async SSR (entry-server `mode: "async"`) awaits it, so the SSR HTML ships the
 * real identity (name, details, blurb) + per-entity <title>/<meta>; the client
 * hydrates from the serialized `query()` cache. `query()` dedupes calls for
 * the same (sport, type, id).
 */
import { Loading, createMemo, createSignal, onSettled, Errored, Show, For } from "solid-js";
import { playerTeamFromRaw, teamHref, staticLogoUrl, type ResolvedMeta } from "../../lib/data/entity-meta.server";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import { type RatingTeam } from "../../lib/data/stats.server";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import { META_SCORE_DECKS, type MetaScoreDeck, type MetaScores } from "../../lib/cards/meta-score-layout";
import MetaScoreRing, { MetaScoreSlot } from "./MetaScoreRing";
import { useProfile } from "../../contexts/profile";
import { CardVessel } from "./Card";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./EntityMeta.css";
// ─── Types ──────────────────────────────────────────────────────────────────
// ─── Component ──────────────────────────────────────────────────────────────
export default function EntityMeta() {
    const ctx = useProfile();
    // Bail out on malformed URLs (no entity to render).
    if (!ctx.sport() || !ctx.id())
        return null;
    // The entity's name lands in the vessel's foot box — the meta card is a
    // card in the set, not a cover for it (Swords set, 2026-08-04). The read
    // dedupes with EntityMetaBody's via the shared meta-maps cache.
    const entity = useProfileRead("meta");
    return (<CardVessel class="meta-widget" title={entity()?.name} aria-label="Entity">
      <EntityMetaBody />
    </CardVessel>);
}
/**
 * EntityMetaSkeleton — the shared profile reveal fallback (used by
 * routes/profile/[sport]/[type]/[id].tsx as the one Loading fallback over EntityMeta +
 * ReadingTable). Mirrors the resolved meta card's composition — logo, name,
 * subtitle, score chips, details grid — so the fallback → content swap
 * happens in place, without shifting the cards below.
 */
export function EntityMetaSkeleton() {
    return (<CardVessel class="meta-widget" aria-label="Entity loading">
      <div class="pw-body">
        <div class="pw-loading" aria-busy="true">
          {/* Mirrors the §06 composition — head numeral, context line,
        crest ring, details grid — so the reveal swaps in place. */}
          <Skeleton shape="line" width={96} height={56}/>
          <Skeleton shape="line" width={140} height={12}/>
          <Skeleton shape="circle" width={84} height={84}/>
          <div class="pw-details">
            <For keyed={false} each={Array.from({ length: 6 })}>
              {() => (<div class="pw-detail-item">
                  <Skeleton shape="line" width={56} height={10}/>
                  <Skeleton shape="line" width={72}/>
                </div>)}
            </For>
          </div>
        </div>
      </div>
    </CardVessel>);
}
function EntityMetaBody() {
    const ctx = useProfile();
    const sport = ctx.sport;
    const id = ctx.id;
    const type = ctx.type;
    const entity = useProfileRead("meta");
    // A player portrait and a team crest have different geometry. Keep the
    // distinction through render so portraits can use the whole circular seat
    // while crests retain their deliberate inset.
    // Image identity deliberately uses the static (bundled-meta) path — never the
    // season-aware stats lookup — so it cannot suspend or fail the meta card.
    const logoUrl = createMemo<string>(() => {
        const r = entity();
        return r ? staticLogoUrl(r, type()) : "";
    });
    const isPlayerHeadshot = createMemo(() => {
        const r = entity();
        return type() === "player" && Boolean(r?.photoUrl) && logoUrl() === r?.photoUrl;
    });
    // Avatar resilience: the logo/photo is often a third-party URL (team crests,
    // provider CDNs) that can 403/404. A broken-image glyph breaks the card's
    // composition, so on error we swap to a monogram on the photo-placeholder
    // surface — the empty state still reads as a full card. Reset per entity.
    const [logoFailed, setLogoFailed] = createSignal(() => { logoUrl(); return false; });
    let logoEl: HTMLImageElement | undefined;
    // Catch images that failed before hydration attached their error listener.
    onSettled(() => {
        if (logoEl?.isConnected && logoEl.complete && logoEl.naturalWidth === 0)
            setLogoFailed(true);
    });
    return (<div class="pw-body">
      {/* No Loading here on purpose: the entity() read suspends up to the
                ROUTE-level boundary in routes/profile/[sport]/[type]/[id].tsx (shared with ReadingTable)
                so the meta content and the card-pane skeletons paint together, in
                final position — the meta-card-first reveal. entity() is the real
                value or null (no entity found) after resolution. */}
      <Show when={entity()} fallback={<div class="pw-error">
            <p>Unable to load {type()} data</p>
          </div>}>
        {(resolved) => (<div class="pw-content">
            {/* §06 meta card (Swords set, 2026-08-04): the same three
                pieces of furniture as the rest of the set. The entity's
                name lives in the vessel's foot box; the overall rating
                takes the head slot in the tier hue; the available deck values
                sit evenly around the crest; the details close the card. */}
            <MetaHead />
            <MetaSubtitle resolved={resolved()}/>
            <div class="pw-ring">
              <div class={["pw-ring-crest", { "pw-ring-headshot": isPlayerHeadshot() }]}>
                <Show when={logoUrl() && !logoFailed()} fallback={<span class="pw-crest-mono" aria-hidden="true">
                      {resolved().name.charAt(0)}
                    </span>}>
                  <img src={logoUrl()} alt={resolved().name} loading="lazy" onError={() => setLogoFailed(true)} ref={logoEl}/>
                </Show>
              </div>
              <Errored fallback={null}><Loading on={`${sport()}|${type()}|${id()}`} fallback={null}><MetaRingReads /></Loading></Errored>
            </div>
            {/* §06: the details close the card as a fixed grid — the card
                doesn't grow and doesn't scroll for identity metadata, so
                players (who can carry 9 rows) cap at the first six. */}
            <div class="pw-details">
              <For each={resolved().details.slice(0, 6)}>
                {(detail) => (<div class="pw-detail-item">
                    <span class="card-micro-eyebrow pw-detail-label">{detail.label}</span>
                    <span class="pw-detail-value">{detail.value}</span>
                  </div>)}
              </For>
            </div>
          </div>)}
      </Show>
    </div>);
}
function StaticSubtitle(props: {
    resolved: ResolvedMeta;
}) {
    const ctx = useProfile();
    const rawTeam = () => (ctx.type() === "player" ? playerTeamFromRaw(props.resolved) : null);
    return (<Show when={rawTeam()} fallback={<Show when={props.resolved.subtitle}>
          <p class="card-eyebrow pw-subtitle">{props.resolved.subtitle}</p>
        </Show>}>
      {(team) => (<p class="card-eyebrow pw-subtitle">
          <a class="pw-subtitle-link" href={teamHref(ctx.sport(), team().id, team().name)}>
            {team().name}
          </a>
        </p>)}
    </Show>);
}
function SeasonAwareSubtitle(props: {
    resolved: ResolvedMeta;
}) {
    const ctx = useProfile();
    const stats = useProfileRead("stats");
    const team = createMemo<RatingTeam | null>(() => {
        const seasonTeam = stats()?.rating?.team;
        return seasonTeam?.id != null ? seasonTeam : playerTeamFromRaw(props.resolved);
    });
    return (<Show when={team()} fallback={<StaticSubtitle resolved={props.resolved}/>}>
      {(t) => (<p class="card-eyebrow pw-subtitle">
          <a class="pw-subtitle-link" href={teamHref(ctx.sport(), t().id, t().name)}>
            {t().name}
          </a>
        </p>)}
    </Show>);
}
function MetaSubtitle(props: {
    resolved: ResolvedMeta;
}) {
    const ctx = useProfile();
    const fallback = () => <StaticSubtitle resolved={props.resolved}/>;
    return (<Show when={ctx.type() === "player"} fallback={fallback()}>
      <Errored fallback={fallback()}>
        <Loading fallback={fallback()}>
          <SeasonAwareSubtitle resolved={props.resolved}/>
        </Loading>
      </Errored>
    </Show>);
}
/**
 * MetaHead — the overall rating in the head slot, tier hue, same
 * furniture position as every card's score (§06: "nothing about the head
 * changes"). Unresolved reads hold the slot with the unread dash.
 */
function MetaHead() {
    const fallback = () => <div class="pw-meta-head" aria-label="Rating not yet read"><span class="pw-meta-head-value pw-score-unclear">—</span></div>;
    return <Errored fallback={fallback()}><Loading fallback={fallback()}><MetaHeadRead /></Loading></Errored>;
}
function MetaHeadRead() {
    const ctx = useProfile();
    const stats = useProfileRead("stats");
    const compositeValue = createMemo<number | null>(() => {
        const rating = stats()?.rating;
        const value = ctx.type() === "team" ? rating?.rating_rank : rating?.rating_score;
        return value != null ? Math.round(value) : null;
    });
    const color = () => compositeValue() == null ? undefined : ctx.type() === "team"
        ? tierColor(compositeValue()!) : tierColorScore(compositeValue()!);
    return <div class="pw-meta-head" aria-label={compositeValue() != null ? `Rating ${compositeValue()}` : "Rating not yet read"}>
        <Show when={compositeValue() != null} fallback={<span class="pw-meta-head-value pw-score-unclear">—</span>}>
            <span class="pw-meta-head-value" style={{ color: color() }}>{String(compositeValue())}</span>
        </Show>
    </div>;
}
/** Keep the existing per-product readers and query deduplication. A missing
 * or failed reading contributes no ring slot; one product's error must not
 * erase the other readings or the entity identity. Reads stay render-time
 * and reactive, so server rendering and later scope changes use the same set. */
function MetaRingReads() {
    const ctx = useProfile();
    return <Show when={ctx.week()} fallback={<LiveMetaRingReads />}><ArchiveMetaRingReads /></Show>;
}
function ArchiveMetaRingReads() {
    const ctx = useProfile();
    const archive = useProfileRead("archive");
    const scores = (): MetaScores => Object.fromEntries(META_SCORE_DECKS.map(deck => [deck, archive()?.entries.find(entry => entry.card === deck)?.score ?? null]));
    return <MetaScoreRing scores={scores()} sport={ctx.sport()} type={ctx.type()}/>;
}
function LiveMetaScore(props: { deck: MetaScoreDeck }) {
    const ctx = useProfile();
    const read = createDeckScoreReader(ctx, useProfileReads(), props.deck);
    return <MetaScoreSlot deck={props.deck} value={read()} sport={ctx.sport()} type={ctx.type()} />;
}
function LiveMetaRingReads() {
    const ctx = useProfile();
    return <For each={META_SCORE_DECKS}>{deck =>
        <Errored fallback={null}>
            <Loading on={`${ctx.sport()}|${ctx.type()}|${ctx.id()}`} fallback={null}>
                <LiveMetaScore deck={deck} />
            </Loading>
        </Errored>
    }</For>;
}
