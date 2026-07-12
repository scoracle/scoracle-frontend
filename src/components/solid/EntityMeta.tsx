/**
 * EntityMeta — Unified player/team meta widget (Solid.js)
 *
 * Reads sport/type/id from ProfileContext. Pure meta-display widget —
 * no UI state, no toggle. EntityMeta is the MetaShell in the profile stack;
 * tab navigation and card panes live in ContentShell, not here.
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
import { createAsync, query } from "@solidjs/router";
import { getSportMetaMaps, type SportMetaMaps } from "../../lib/data/entity-directory";
import { getPositionGroup } from "../../lib/utils/position-groups";
import {
  formatAgeFromDob,
  formatHeightForDisplay,
  formatWeightForDisplay,
} from "../../lib/utils/player-metrics";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import { pillarLabel } from "../../lib/cards/card-meta";
import { getStats, type RatingTeam } from "../../lib/data/stats.server";
import { getSigil } from "../../lib/data/sigil.server";
import { getMomentum } from "../../lib/data/momentum.server";
import { useProfile } from "../../contexts/profile";
import type { EntityType, PlayerMeta, TeamMeta } from "../../lib/types";
import Shell from "./Shell";
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

function teamHref(sport: string, teamId: number): string {
  return `/profile?sport=${sport.toUpperCase()}&type=team&id=${teamId}`;
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
  // getSportMetaMaps is itself a query(), so the sport's meta JSON loads once
  // per request/session no matter how many entities resolve against it — and
  // only this ONE entity's resolved meta rides the createAsync serialization.
  const maps = await getSportMetaMaps(sport).catch(() => null);
  return maps ? resolveFromMaps(maps, sport, type, id) : null;
}

export const getEntityMeta = query(resolveEntityMeta, "entity-meta");

// ─── Component ──────────────────────────────────────────────────────────────

export default function EntityMeta() {
  const ctx = useProfile();

  // Bail out on malformed URLs (no entity to render).
  if (!ctx.sport() || !ctx.id()) return null;

  // Entity ID drives the corner-numeral slot — sport/type/id come from
  // ProfileContext synchronously, so the prop can land at mount without
  // waiting on async meta resolution.
  return (
    <Shell class="meta-widget" cornerLabel={ctx.id()} aria-label="Entity">
      <EntityMetaBody />
    </Shell>
  );
}

/**
 * EntityMetaSkeleton — the shared profile reveal fallback (used by
 * routes/profile.tsx as the one Suspense fallback over EntityMeta +
 * ContentShell). Mirrors the resolved meta card's composition — logo, name,
 * subtitle, score chips, details grid — so the fallback → content swap
 * happens in place, without shifting the cards below.
 */
export function EntityMetaSkeleton() {
  return (
    <Shell class="meta-widget" aria-label="Entity loading">
      <div class="pw-body">
        <div class="pw-loading" aria-busy="true">
          <Skeleton shape="line" width={200} height={26} />
          <Skeleton shape="line" width={140} />
          <Skeleton shape="circle" width={64} height={64} />
          <Skeleton shape="line" width={220} height={44} />
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
    </Shell>
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
          ROUTE-level boundary in routes/profile.tsx (shared with ContentShell)
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
            {/* The name IS the card's header (Scott, 2026-07-11); the
                avatar sits mid-card, just above the house scores. */}
            <h2 class="pw-name">{resolved().name}</h2>
            <MetaSubtitle resolved={resolved()} />
            <Show
              when={logoUrl() && !logoFailed()}
              fallback={
                <span class="pw-logo pw-logo-mono" aria-hidden="true">
                  {resolved().name.charAt(0)}
                </span>
              }
            >
              <img
                src={logoUrl()}
                alt={resolved().name}
                class="pw-logo"
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
            <MetaScoreChips />
            <div class="pw-details">
              <For each={resolved().details}>
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
          <a class="pw-subtitle-link" href={teamHref(ctx.sport(), team().id)}>
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
          <a class="pw-subtitle-link" href={teamHref(ctx.sport(), t().id)}>
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

function RatingScoreChip() {
  const ctx = useProfile();
  const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  // Null composite (sub-gate / low-minute entities) renders nothing — a house
  // score is either earned or absent, never excused (Scott, 2026-07-11).
  const compositeValue = createMemo<number | null>(() => {
    const rating = stats()?.rating;
    if (!rating) return null;
    const v = ctx.type() === "team" ? rating.rating_composite_rank : rating.rating_composite_score;
    return v != null ? v : null;
  });

  return (
    <Show when={compositeValue() != null}>
      <div class="pw-score-slot pw-score-slot-rating">
        <div class="pw-score-item">
          <span
            class="pw-score-value"
            style={{
              color:
                ctx.type() === "team"
                  ? tierColor(compositeValue()!)
                  : tierColorScore(compositeValue()!),
            }}
          >
            {Math.round(compositeValue()!).toString()}
          </span>
          <span class="card-micro-eyebrow pw-score-label">
            {pillarLabel("rating", ctx.type())}
          </span>
        </div>
      </div>
    </Show>
  );
}

function SigilScoreChip() {
  const ctx = useProfile();
  const sigil = createAsync(() => getSigil(ctx.sport(), ctx.type(), ctx.id()));
  const score = createMemo<number | null>(() => {
    const current = sigil()?.current;
    return current?.score != null ? Math.round(current.score as number) : null;
  });

  return (
    <Show when={score() != null}>
      <div class="pw-score-slot pw-score-slot-sigil">
        <div class="pw-score-item pw-score-sigil">
          <span class="pw-score-value" style={{ color: tierColor(score()!) }}>
            {score()}
          </span>
          <span class="card-micro-eyebrow pw-score-label">
            {pillarLabel("sigil", ctx.type())}
          </span>
        </div>
      </div>
    </Show>
  );
}

function VibeScoreChip() {
  const ctx = useProfile();
  const momentum = createAsync(() => getMomentum(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  const sentiment = createMemo<number | null>(() => {
    const series = momentum()?.entity_season_sentiment_series;
    if (!series || series.length === 0) return null;
    return Math.round(series.reduce((a, b) => (b.date > a.date ? b : a)).sentiment_avg);
  });

  return (
    <Show when={sentiment() != null}>
      <div class="pw-score-slot pw-score-slot-vibe">
        <div class="pw-score-item">
          <span class="pw-score-value" style={{ color: tierColor(sentiment()!) }}>
            {sentiment()}
          </span>
          <span class="card-micro-eyebrow pw-score-label">Vibe</span>
        </div>
      </div>
    </Show>
  );
}

/**
 * The three standout value scores — Rating · Sigil · Vibe — as one row.
 * Each chip self-hides when its product is missing and suspends/errors in
 * isolation (fallback null), so the row is always a clean subset.
 * ShadowCard stamps the same row onto the copied artifact from resolved
 * values (its detached root can't host these reactive chips) — keep the
 * derivations in sync with ShadowCard's resolveScores.
 */
function MetaScoreChips() {
  return (
    <div class="pw-scores">
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <RatingScoreChip />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SigilScoreChip />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <VibeScoreChip />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
