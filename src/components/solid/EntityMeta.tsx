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
import { isServer } from "solid-js/web";
import { createAsync, query } from "@solidjs/router";
import { getSportMetaMaps, readSportMetaMaps, type SportMetaMaps } from "../../lib/data/entity-directory";
import { getPositionGroup } from "../../lib/utils/position-groups";
import {
  formatAgeFromDob,
  formatHeightForDisplay,
  formatWeightForDisplay,
} from "../../lib/utils/player-metrics";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import { pillarLabel } from "../../lib/cards/card-meta";
import { getStats, type RatingTeam } from "../../lib/data/stats.server";
import { profilePath } from "../../lib/utils/profile-url";
import { getSigil } from "../../lib/data/sigil.server";
import { getMomentum } from "../../lib/data/momentum.server";
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
 * ContentShell). Mirrors the resolved meta card's composition — logo, name,
 * subtitle, score chips, details grid — so the fallback → content swap
 * happens in place, without shifting the cards below.
 */
export function EntityMetaSkeleton() {
  return (
    <CardVessel class="meta-widget" aria-label="Entity loading">
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
          ROUTE-level boundary in routes/profile/[sport]/[type]/[id].tsx (shared with ContentShell)
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
            {/* The name lives in the vessel's foot box (Swords set,
                2026-08-04); the subtitle leads the body and the avatar
                sits mid-card, just above the house scores. */}
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
 * One house-score slot. A resolved read shows its tier-colored value; an
 * unresolved read shows a quiet em dash — "unclear" — in tertiary ink.
 * All three slots ALWAYS render (Scott, 2026-07-16, supersedes the
 * 2026-07-11 "earned or absent" rule): the row is the card's readout, and
 * a missing product reads as unclear, never as a shorter row.
 */
function ScoreSlot(props: {
  kind: "rating" | "sigil" | "vibe";
  label: string;
  value: number | null;
  color?: string;
}) {
  return (
    <div class={`pw-score-slot pw-score-slot-${props.kind}`}>
      <div class="pw-score-item" classList={{ "pw-score-sigil": props.kind === "sigil" }}>
        <Show
          when={props.value != null}
          fallback={
            <span class="pw-score-value pw-score-unclear" title="Unclear">
              —
            </span>
          }
        >
          <span class="pw-score-value" style={{ color: props.color }}>
            {props.value}
          </span>
        </Show>
        <span class="card-micro-eyebrow pw-score-label">{props.label}</span>
      </div>
    </div>
  );
}

function RatingScoreChip(props: { label: string }) {
  const ctx = useProfile();
  const stats = createAsync(() => getStats(ctx.sport(), ctx.type(), ctx.id(), ctx.season()));
  // Null composite (sub-gate / low-minute entities) reads as unclear.
  const compositeValue = createMemo<number | null>(() => {
    const rating = stats()?.rating;
    if (!rating) return null;
    const v = ctx.type() === "team" ? rating.rating_composite_rank : rating.rating_composite_score;
    return v != null ? v : null;
  });

  return (
    <ScoreSlot
      kind="rating"
      label={props.label}
      value={compositeValue() != null ? Math.round(compositeValue()!) : null}
      color={
        compositeValue() != null
          ? ctx.type() === "team"
            ? tierColor(compositeValue()!)
            : tierColorScore(compositeValue()!)
          : undefined
      }
    />
  );
}

function SigilScoreChip(props: { label: string }) {
  const ctx = useProfile();
  const sigil = createAsync(() => getSigil(ctx.sport(), ctx.type(), ctx.id()));
  const score = createMemo<number | null>(() => {
    const current = sigil()?.current;
    return current?.score != null ? Math.round(current.score as number) : null;
  });

  return (
    <ScoreSlot
      kind="sigil"
      label={props.label}
      value={score()}
      color={score() != null ? tierColor(score()!) : undefined}
    />
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
    <ScoreSlot
      kind="vibe"
      label="Vibe"
      value={sentiment()}
      color={sentiment() != null ? tierColor(sentiment()!) : undefined}
    />
  );
}

/**
 * The three house scores — Rating · Sigil · Vibe — as one fixed row.
 * Every slot always shows; a product that can't resolve (no data, or its
 * read errors) shows the unclear dash instead of dropping out, so the row
 * never changes shape. Each chip suspends in isolation (fallback null keeps
 * the reveal clean); an ERROR resolves to the unclear slot.
 */
function MetaScoreChips() {
  const ctx = useProfile();
  // "Rating" is the product's name, not a card id — the rating card retired
  // into Scouting (Characters Phase 1); the house score keeps its name.
  const ratingLabel = () => "Rating";
  const sigilLabel = () => pillarLabel("sigil", ctx.type()) ?? "Sigil";

  return (
    <div class="pw-scores">
      <ErrorBoundary fallback={<ScoreSlot kind="rating" label={ratingLabel()} value={null} />}>
        <Suspense fallback={null}>
          <RatingScoreChip label={ratingLabel()} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={<ScoreSlot kind="sigil" label={sigilLabel()} value={null} />}>
        <Suspense fallback={null}>
          <SigilScoreChip label={sigilLabel()} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={<ScoreSlot kind="vibe" label="Vibe" value={null} />}>
        <Suspense fallback={null}>
          <VibeScoreChip />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
