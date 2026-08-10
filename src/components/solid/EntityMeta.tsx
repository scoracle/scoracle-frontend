/**
 * EntityMeta — Unified player/team meta widget (Solid.js)
 *
 * Reads sport/type/id from ProfileContext. Pure meta-display widget —
 * no UI state, no toggle. EntityMeta is the meta card in the profile stack;
 * tab navigation and card panes live in ReadingTable, not here.
 *
 * Data flow: same `createAsync` / `query()` shape as the rest of the
 * platform. `getEntityMeta` reads the bundled meta JSON (Workers Static
 * Assets — no Go-API round-trip) and resolves on BOTH server and client.
 * Async SSR (entry-server `mode: "async"`) awaits it, so the SSR HTML ships the
 * real identity (name, details, blurb) + per-entity <title>/<meta>; the client
 * hydrates from the serialized `query()` cache. `query()` dedupes calls for
 * the same (sport, type, id).
 */

import { Suspense, createMemo, createSignal, createEffect, on, ErrorBoundary, Show, For, Index } from "solid-js";
import { isServer } from "solid-js/web";
import { createAsync, query } from "@solidjs/router";
import { getSportMetaMaps, readSportMetaMaps, type SportMetaMaps } from "../../lib/data/entity-directory";
import { getPositionGroup } from "../../lib/utils/position-groups";
import {
  formatAgeFromDob,
  formatHeightForDisplay,
  formatWeightForDisplay,
} from "../../lib/utils/player-metrics";
import { tierColor, tierColorScore, cardScoreColor } from "../../lib/utils/tier-color";
import { transferNoun } from "../../lib/cards/card-meta";
import { getStats, type RatingTeam } from "../../lib/data/stats.server";
import { createDeckScoreReader } from "../../lib/cards/deck-scores";
import { displayScore } from "../../lib/cards/tarot-deck";
import type { ProfileTab } from "../../contexts/profile";
import { profilePath } from "../../lib/utils/profile-url";
import { useProfile } from "../../contexts/profile";
import type { EntityType, PlayerMeta, TeamMeta } from "../../lib/types";
import { CardVessel } from "./Card";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./EntityMeta.css";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Detail {
  label: string;
  value: string;
}

export interface ResolvedMeta {
  name: string;
  subtitle: string;
  logoUrl: string;
  /** Player headshot only — empty when the sport ships no photo (NBA/NFL). */
  photoUrl: string;
  /** Team crest — the player's team crest, or the team's own logo. */
  teamLogoUrl: string;
  details: Detail[];
  position?: string;
  positionGroup?: string;
  raw: PlayerMeta | TeamMeta;
}

// ─── Detail builders ────────────────────────────────────────────────────────

function formatDraft(year?: number, round?: number, pick?: number): string | null {
  const parts: string[] = [];
  if (year) parts.push(String(year));
  if (round) parts.push(`R${round}`);
  if (pick) parts.push(`#${pick}`);
  return parts.length ? parts.join(" · ") : null;
}

function buildPlayerDetails(meta: PlayerMeta): Detail[] {
  const details: Detail[] = [];

  const position = meta.detailed_position || meta.position;
  if (position) details.push({ label: "Position", value: position });

  if (meta.jersey_number) {
    details.push({ label: "Number", value: `#${meta.jersey_number}` });
  }

  const height = formatHeightForDisplay(meta.height);
  if (height) details.push({ label: "Height", value: height });

  const weight = formatWeightForDisplay(meta.weight);
  if (weight) details.push({ label: "Weight", value: weight });

  // NFL ships a numeric age directly; Football derives it from DOB.
  const age = meta.age != null ? String(meta.age) : formatAgeFromDob(meta.date_of_birth);
  if (age) details.push({ label: "Age", value: age });

  const country = meta.birth_country || meta.nationality;
  if (country) details.push({ label: "Nationality", value: country });

  if (meta.college) details.push({ label: "College", value: meta.college });

  const draft = formatDraft(meta.draft_year, meta.draft_round, meta.draft_pick);
  if (draft) details.push({ label: "Draft", value: draft });

  if (meta.experience) details.push({ label: "Experience", value: meta.experience });

  if (meta.league?.name) details.push({ label: "League", value: meta.league.name });

  return details;
}

function buildTeamDetails(meta: TeamMeta, sport: string): Detail[] {
  const details: Detail[] = [];

  if (meta.league?.name) details.push({ label: "League", value: meta.league.name });
  // Country is redundant for single-nation leagues (NBA / NFL); kept for
  // Football where teams span multiple countries.
  const isAmericanLeague = sport.toUpperCase() === "NBA" || sport.toUpperCase() === "NFL";
  if (meta.country && !isAmericanLeague) {
    details.push({ label: "Country", value: meta.country });
  }
  if (meta.conference) details.push({ label: "Conference", value: meta.conference });
  if (meta.division) details.push({ label: "Division", value: meta.division });
  if (meta.founded) details.push({ label: "Founded", value: String(meta.founded) });
  if (meta.venue_name) details.push({ label: "Venue", value: meta.venue_name });
  if (meta.venue_capacity) {
    details.push({ label: "Capacity", value: meta.venue_capacity.toLocaleString() });
  }

  return details;
}

// ─── Data resolution ────────────────────────────────────────────────────────

function resolvePlayer(meta: PlayerMeta, sport: string, maps: SportMetaMaps): ResolvedMeta {
  const name =
    meta.name ||
    `${meta.first_name || ""} ${meta.last_name || ""}`.trim() ||
    "Unknown Player";

  const photoUrl = meta.photo_url || "";
  const teamLogoUrl =
    meta.team?.id != null ? maps.teams[String(meta.team.id)]?.logo_url || "" : "";

  return {
    name,
    subtitle: meta.team?.name || "",
    // No player photo? Fall back to the team crest (NBA and NFL have no
    // photo_url upstream, so this is the primary avatar path for those).
    logoUrl: photoUrl || teamLogoUrl,
    photoUrl,
    teamLogoUrl,
    details: buildPlayerDetails(meta),
    position: meta.position,
    positionGroup: getPositionGroup(sport, meta.position),
    raw: meta,
  };
}

function resolveTeam(meta: TeamMeta, sport: string): ResolvedMeta {
  return {
    name: meta.name || "Unknown Team",
    subtitle: meta.city || "",
    logoUrl: meta.logo_url || "",
    photoUrl: "",
    teamLogoUrl: meta.logo_url || "",
    details: buildTeamDetails(meta, sport),
    raw: meta,
  };
}

// ─── Query ──────────────────────────────────────────────────────────────────

function resolveFromMaps(
  maps: SportMetaMaps,
  sport: string,
  type: EntityType,
  id: string,
): ResolvedMeta | null {
  if (type === "player") {
    const meta = maps.players[id];
    return meta ? resolvePlayer(meta, sport, maps) : null;
  }
  const meta = maps.teams[id];
  return meta ? resolveTeam(meta, sport) : null;
}

function playerTeamFromRaw(resolved: ResolvedMeta): RatingTeam | null {
  const raw = resolved.raw as PlayerMeta;
  const team = raw.team;
  return team?.id != null
    ? {
        id: team.id,
        name: team.name,
        short_code: team.abbreviation ?? null,
        logo_url: team.logo_url ?? null,
      }
    : null;
}

function teamHref(sport: string, teamId: number, teamName?: string | null): string {
  return profilePath(sport, "team", teamId, { name: teamName });
}

function staticLogoUrl(resolved: ResolvedMeta, type: EntityType): string {
  if (type === "player") {
    const raw = resolved.raw as PlayerMeta;
    return raw.photo_url || resolved.logoUrl;
  }
  return resolved.logoUrl;
}

export async function resolveEntityMeta(
  sport: string,
  type: EntityType,
  id: string,
): Promise<ResolvedMeta | null> {
  if (!sport || !id) return null;
  // Server: read the isolate-memoized maps DIRECTLY. Any query() that runs
  // during SSR serializes its full result into the hydration payload, so
  // going through getSportMetaMaps here shipped the entire sport map (3.1MB
  // of HTML for football) with every profile render. Only this ONE entity's
  // resolved meta may ride the createAsync serialization.
  // Client: the query() is right — it dedupes with the search/scope surfaces
  // and one browser fetch of the meta JSON serves the whole session.
  const maps = await (isServer ? readSportMetaMaps(sport) : getSportMetaMaps(sport)).catch(
    () => null,
  );
  return maps ? resolveFromMaps(maps, sport, type, id) : null;
}

export const getEntityMeta = query(resolveEntityMeta, "entity-meta");

// ─── Component ──────────────────────────────────────────────────────────────

export default function EntityMeta() {
  const ctx = useProfile();

  // Bail out on malformed URLs (no entity to render).
  if (!ctx.sport() || !ctx.id()) return null;

  // The entity's name lands in the vessel's foot box — the meta card is a
  // card in the set, not a cover for it (Swords set, 2026-08-04). The read
  // dedupes with EntityMetaBody's via the shared meta-maps cache.
  const entity = createAsync(() => resolveEntityMeta(ctx.sport(), ctx.type(), ctx.id()));

  return (
    <CardVessel class="meta-widget" title={entity()?.name} aria-label="Entity">
      <EntityMetaBody />
    </CardVessel>
  );
}

/**
 * EntityMetaSkeleton — the shared profile reveal fallback (used by
 * routes/profile/[sport]/[type]/[id].tsx as the one Suspense fallback over EntityMeta +
 * ReadingTable). Mirrors the resolved meta card's composition — logo, name,
 * subtitle, score chips, details grid — so the fallback → content swap
 * happens in place, without shifting the cards below.
 */
export function EntityMetaSkeleton() {
  return (
    <CardVessel class="meta-widget" aria-label="Entity loading">
      <div class="pw-body">
        <div class="pw-loading" aria-busy="true">
          {/* Mirrors the §06 composition — head numeral, context line,
              crest ring, details grid — so the reveal swaps in place. */}
          <Skeleton shape="line" width={96} height={56} />
          <Skeleton shape="line" width={140} height={12} />
          <Skeleton shape="circle" width={84} height={84} />
          <div class="pw-details">
            <Index each={Array.from({ length: 6 })}>
              {() => (
                <div class="pw-detail-item">
                  <Skeleton shape="line" width={56} height={10} />
                  <Skeleton shape="line" width={72} />
                </div>
              )}
            </Index>
          </div>
        </div>
      </div>
    </CardVessel>
  );
}

function EntityMetaBody() {
  const ctx = useProfile();

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  const entity = createAsync(() => resolveEntityMeta(sport(), type(), id()));

  // Logo: player photo wins; otherwise the bundled team crest/placeholder.
  // Image identity deliberately uses the static (bundled-meta) path — never the
  // season-aware stats lookup — so it cannot suspend or fail the meta card.
  const logoUrl = createMemo<string>(() => {
    const r = entity();
    return r ? staticLogoUrl(r, type()) : "";
  });
  // Avatar resilience: the logo/photo is often a third-party URL (team crests,
  // provider CDNs) that can 403/404. A broken-image glyph breaks the card's
  // composition, so on error we swap to a monogram on the photo-placeholder
  // surface — the empty state still reads as a full card. Reset per entity.
  const [logoFailed, setLogoFailed] = createSignal(false);
  createEffect(on(id, () => setLogoFailed(false), { defer: true }));

  return (
    <div class="pw-body">
      {/* No Suspense here on purpose: the entity() read suspends up to the
          ROUTE-level boundary in routes/profile/[sport]/[type]/[id].tsx (shared with ReadingTable)
          so the meta content and the card-pane skeletons paint together, in
          final position — the meta-card-first reveal. entity() is the real
          value or null (no entity found) after resolution. */}
      <Show
        when={entity()}
        fallback={
          <div class="pw-error">
            <p>Unable to load {type()} data</p>
          </div>
        }
      >
        {(resolved) => (
          <div class="pw-content">
            {/* §06 meta card (Swords set, 2026-08-04): the same three
                pieces of furniture as the rest of the set. The entity's
                name lives in the vessel's foot box; the overall rating
                takes the head slot in the tier hue; the six deck values
                sit evenly around the crest; the details close the card. */}
            <MetaHead />
            <MetaSubtitle resolved={resolved()} />
            <div class="pw-ring">
              <RingStrokes />
              <div class="pw-ring-crest">
                <Show
                  when={logoUrl() && !logoFailed()}
                  fallback={
                    <span class="pw-crest-mono" aria-hidden="true">
                      {resolved().name.charAt(0)}
                    </span>
                  }
                >
                  <img
                    src={logoUrl()}
                    alt={resolved().name}
                    loading="lazy"
                    onError={() => setLogoFailed(true)}
                    ref={(el) => {
                      // SSR'd images can fail BEFORE hydration attaches the
                      // error listener — read the already-settled state off
                      // the element so those failures still fall back. The
                      // check is deferred a tick: flipping the <Show> inside
                      // the ref would mutate the tree mid-hydration and
                      // desync the hydration keys.
                      setTimeout(() => {
                        if (el.isConnected && el.complete && el.naturalWidth === 0) {
                          setLogoFailed(true);
                        }
                      }, 0);
                    }}
                  />
                </Show>
              </div>
              <For each={RING_SLOTS}>
                {(slot) => <RingValue deck={slot.deck} x={slot.x} y={slot.y} />}
              </For>
            </div>
            {/* §06: the details close the card as a fixed grid — the card
                doesn't grow and doesn't scroll for identity metadata, so
                players (who can carry 9 rows) cap at the first six. */}
            <div class="pw-details">
              <For each={resolved().details.slice(0, 6)}>
                {(detail) => (
                  <div class="pw-detail-item">
                    <span class="card-micro-eyebrow pw-detail-label">{detail.label}</span>
                    <span class="pw-detail-value">{detail.value}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

function StaticSubtitle(props: { resolved: ResolvedMeta }) {
  const ctx = useProfile();
  const rawTeam = () => (ctx.type() === "player" ? playerTeamFromRaw(props.resolved) : null);

  return (
    <Show
      when={rawTeam()}
      fallback={
        <Show when={props.resolved.subtitle}>
          <p class="card-eyebrow pw-subtitle">{props.resolved.subtitle}</p>
        </Show>
      }
    >
      {(team) => (
        <p class="card-eyebrow pw-subtitle">
          <a class="pw-subtitle-link" href={teamHref(ctx.sport(), team().id, team().name)}>
            {team().name}
          </a>
        </p>
      )}
    </Show>
  );
}

function SeasonAwareSubtitle(props: { resolved: ResolvedMeta }) {
  const ctx = useProfile();
  const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  const team = createMemo<RatingTeam | null>(() => {
    const seasonTeam = stats()?.rating?.team;
    return seasonTeam?.id != null ? seasonTeam : playerTeamFromRaw(props.resolved);
  });

  return (
    <Show when={team()} fallback={<StaticSubtitle resolved={props.resolved} />}>
      {(t) => (
        <p class="card-eyebrow pw-subtitle">
          <a class="pw-subtitle-link" href={teamHref(ctx.sport(), t().id, t().name)}>
            {t().name}
          </a>
        </p>
      )}
    </Show>
  );
}

function MetaSubtitle(props: { resolved: ResolvedMeta }) {
  const ctx = useProfile();
  const fallback = () => <StaticSubtitle resolved={props.resolved} />;

  return (
    <Show when={ctx.type() === "player"} fallback={fallback()}>
      <ErrorBoundary fallback={fallback()}>
        <Suspense fallback={fallback()}>
          <SeasonAwareSubtitle resolved={props.resolved} />
        </Suspense>
      </ErrorBoundary>
    </Show>
  );
}

/**
 * MetaHead — the overall rating in the head slot, tier hue, same
 * furniture position as every card's score (§06: "nothing about the head
 * changes"). Unresolved reads hold the slot with the unread dash.
 */
function MetaHead() {
  const ctx = useProfile();
  const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  // Null composite (sub-gate / low-minute entities) reads as unclear.
  const compositeValue = createMemo<number | null>(() => {
    const rating = stats()?.rating;
    if (!rating) return null;
    const v = ctx.type() === "team" ? rating.rating_composite_rank : rating.rating_composite_score;
    return v != null ? Math.round(v) : null;
  });
  const color = () =>
    compositeValue() != null
      ? ctx.type() === "team"
        ? tierColor(compositeValue()!)
        : tierColorScore(compositeValue()!)
      : undefined;

  return (
    <div
      class="pw-meta-head"
      aria-label={compositeValue() != null ? `Rating ${compositeValue()}` : "Rating not yet read"}
    >
      <ErrorBoundary fallback={<span class="pw-meta-head-value pw-score-unclear">—</span>}>
        <Suspense fallback={<span class="pw-meta-head-value pw-score-unclear">—</span>}>
          <Show
            when={compositeValue() != null}
            fallback={<span class="pw-meta-head-value pw-score-unclear">—</span>}
          >
            <span class="pw-meta-head-value" style={{ color: color() }}>
              {compositeValue()}
            </span>
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

/**
 * The ring (§06): six deck values sit evenly around the crest, reading
 * clockwise from the top in tray order — Scouting, Narratives, Transfers,
 * Vibe, Momentum, Sigil — so position is learnable. Coordinates are the
 * slot centers inside the square ring box.
 */
const RING_SLOTS: ReadonlyArray<{ deck: ProfileTab; x: number; y: number }> = [
  { deck: "scouting", x: 50, y: 15 },
  { deck: "narratives", x: 84, y: 32.5 },
  { deck: "transfers", x: 84, y: 67.5 },
  { deck: "vibe", x: 50, y: 85 },
  { deck: "momentum", x: 16, y: 67.5 },
  { deck: "sigil", x: 16, y: 32.5 },
];

/** One ring slot: the deck's value in its own tier hue over its label.
 *  Suspends and errors in isolation — an outage reads as the unclear dash,
 *  never a missing slot. */
function RingValue(props: { deck: ProfileTab; x: number; y: number }) {
  const ctx = useProfile();
  const label = () =>
    props.deck === "transfers"
      ? transferNoun(ctx.sport())
      : props.deck.charAt(0).toUpperCase() + props.deck.slice(1);

  return (
    <div class="pw-ring-slot" style={{ left: `${props.x}%`, top: `${props.y}%` }}>
      <ErrorBoundary fallback={<span class="pw-ring-value pw-score-unclear">—</span>}>
        <Suspense fallback={<span class="pw-ring-value pw-score-unclear">—</span>}>
          <RingValueRead deck={props.deck} />
        </Suspense>
      </ErrorBoundary>
      <span class="pw-ring-label">{label()}</span>
    </div>
  );
}

function RingValueRead(props: { deck: ProfileTab }) {
  const ctx = useProfile();
  const read = createDeckScoreReader(ctx, props.deck);
  const value = createMemo<number | null>(() => {
    const raw = read();
    return raw == null || !Number.isFinite(raw) ? null : displayScore(raw);
  });

  return (
    <Show
      when={value() != null}
      fallback={<span class="pw-ring-value pw-score-unclear">—</span>}
    >
      <span
        class="pw-ring-value"
        style={{ color: cardScoreColor(props.deck, value()!, ctx.type()) }}
      >
        {value()}
      </span>
    </Show>
  );
}

/**
 * The drawing (§06): six strokes curving inward from the numbers to the
 * crest — each voice bending toward the same entity — plus the faint ring
 * the crest sits in. Drawn ON the card rather than behind it, because it
 * has to line up with the numbers. Geometry from the Swords-set mock.
 */
function RingStrokes() {
  // Stroke reads --card-linework, never a baked rgba: this is drawn ON
  // cardstock and the deck themes (Night Deck, 2026-08-10). The old
  // hardcoded warm ink was dark-on-dark on night stock, so the six strokes
  // disappeared entirely.
  return (
    <svg
      class="pw-ring-strokes"
      viewBox="0 0 240 240"
      fill="none"
      stroke="var(--card-linework, rgba(23, 20, 16, 0.13))"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M 120.0 44.0 Q 138.7 67.2 122.2 83.1" stroke-width="1" />
      <path d="M 185.8 82.0 Q 175.1 109.8 153.1 103.5" stroke-width="1" />
      <path d="M 185.8 158.0 Q 156.4 162.6 150.9 140.4" stroke-width="1" />
      <path d="M 120.0 196.0 Q 101.3 172.8 117.8 156.9" stroke-width="1" />
      <path d="M 54.2 158.0 Q 64.9 130.2 86.9 136.5" stroke-width="1" />
      <path d="M 54.2 82.0 Q 83.6 77.4 89.1 99.6" stroke-width="1" />
      <circle cx="120" cy="120" r="46" stroke-width="0.7" />
    </svg>
  );
}
