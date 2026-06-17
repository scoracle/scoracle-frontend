/**
 * EntityMeta — Unified player/team meta widget (Solid.js)
 *
 * Reads sport/type/id from ProfileContext. Pure meta-display widget —
 * no UI state, no toggle. EntityMeta is the MetaShell of the three-Shell
 * profile stack (MetaShell → TabShell → ContentShell); the news/stats
 * tab navigation lives in TabShell, not here.
 *
 * Data flow: same `createAsync` / `query()` shape as the rest of the
 * platform. `getEntityMeta` reads the bundled meta JSON (Workers Static
 * Assets — no Go-API round-trip) and resolves on BOTH server and client.
 * Async SSR (entry-server `mode: "async"`) awaits it, so the SSR HTML ships the
 * real identity (name, details, blurb) + per-entity <title>/<meta>; the client
 * hydrates from the serialized `query()` cache. `query()` dedupes calls for
 * the same (sport, type, id).
 */

import { Suspense, createMemo, ErrorBoundary, Show, For } from "solid-js";
import { createAsync, query } from "@solidjs/router";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import { getPositionGroup } from "../../lib/utils/position-groups";
import {
  formatAgeFromDob,
  formatHeightForDisplay,
  formatWeightForDisplay,
} from "../../lib/utils/player-metrics";
import { tierColor, tierColorScore } from "../../lib/utils/tier-color";
import { pillarLabel } from "../../lib/cards/card-meta";
import { getStats, type RatingTeam } from "../../lib/data/stats.server";
import { getVibes } from "../../lib/data/vibes.server";
import { useProfile } from "../../contexts/profile";
import type { EntityType, PlayerMeta, TeamMeta } from "../../lib/types";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
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

function resolvePlayer(meta: PlayerMeta, sport: string): ResolvedMeta {
  const name =
    meta.name ||
    `${meta.first_name || ""} ${meta.last_name || ""}`.trim() ||
    "Unknown Player";

  // No player photo? Fall back to the team logo (NBA and NFL have no
  // photo_url upstream, so this is the primary avatar path for those).
  let logoUrl = meta.photo_url || "";
  if (!logoUrl && meta.team?.id != null) {
    const teamMeta = entityDataStore.getTeamMetaSync(sport, String(meta.team.id));
    logoUrl = teamMeta?.logo_url || "";
  }

  return {
    name,
    subtitle: meta.team?.name || "",
    logoUrl,
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
    details: buildTeamDetails(meta, sport),
    raw: meta,
  };
}

// ─── Query ──────────────────────────────────────────────────────────────────

function readMetaSync(sport: string, type: EntityType, id: string): ResolvedMeta | null {
  if (type === "player") {
    const meta = entityDataStore.getPlayerMetaSync(sport, id);
    return meta ? resolvePlayer(meta, sport) : null;
  }
  const meta = entityDataStore.getTeamMetaSync(sport, id);
  return meta ? resolveTeam(meta, sport) : null;
}

async function fetchEntityMeta(
  sport: string,
  type: EntityType,
  id: string,
): Promise<ResolvedMeta | null> {
  // Sync first — if the meta JSON is already loaded, this is instant.
  const sync = readMetaSync(sport, type, id);
  if (sync) return sync;
  // Async fallback: load the sport's meta DB, then read sync.
  await entityDataStore.loadMeta(sport).catch(() => {});
  return readMetaSync(sport, type, id);
}

export const getEntityMeta = query(fetchEntityMeta, "entity-meta");

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

function EntityMetaBody() {
  const ctx = useProfile();

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  const entity = createAsync(() => getEntityMeta(sport(), type(), id()));

  // Lazy cross-card aggregates: each resolves via the same query() cache
  // that StatsCard / VibeCard use, so they piggyback on the route's
  // preload and land warm. Each readout below sits inside its own
  // <Suspense> so it pops in without blocking the meta render.
  const stats = createAsync(() => getStats(sport(), type(), id(), ctx.season()));
  const vibe = createAsync(() => getVibes(sport(), type(), id()));

  // Season-aware team for PLAYERS — the team they played for in the selected (or
  // latest) season, straight off the rating payload. Falls back to the bundled
  // meta team before the rating resolves / for unrated players. This is why the
  // meta card tracks the year (Díaz → Bayern by default, Liverpool for 2020)
  // instead of showing a stale last-seeded team.
  const playerTeam = createMemo<RatingTeam | null>(() => {
    if (type() !== "player") return null;
    const t = stats()?.rating?.team;
    if (t?.id != null) return t;
    const raw = entity()?.raw as PlayerMeta | undefined;
    const bt = raw?.team;
    return bt?.id != null
      ? { id: bt.id, name: bt.name, short_code: null, logo_url: null }
      : null;
  });

  const teamHref = (teamId: number) =>
    `/profile?sport=${sport().toUpperCase()}&type=team&id=${teamId}`;

  // Logo: player photo wins; otherwise the season-aware team crest (NBA/NFL have
  // no player photos), falling back to the bundled resolved logo.
  const logoUrl = createMemo<string>(() => {
    const r = entity();
    if (!r) return "";
    if (type() === "player") {
      const raw = r.raw as PlayerMeta;
      if (raw.photo_url) return raw.photo_url;
      return playerTeam()?.logo_url || r.logoUrl;
    }
    return r.logoUrl;
  });

  // The three pillar scores under the logo come from the rating engine's season
  // summary (sparkline.rating). The Composite chip is entity-type-conditional:
  // PLAYERS show the magnitude SCORE (rating_composite_score; 0-100, ~50 = average,
  // tierColorScore) — the displayed Rating; TEAMS keep the percentile RANK
  // (rating_composite_rank, tierColor). Both come off sparkline.rating.
  // Null = hide that cell (never "—"/"0"); the backend's null is authoritative.
  const compositeValue = createMemo<number | null>(() => {
    const rating = stats()?.rating;
    if (!rating) return null;
    const v = type() === "team" ? rating.rating_composite_rank : rating.rating_composite_score;
    return v != null ? v : null;
  });
  // Sub-gate (low-minute) players: a breakdown but no composite rank — "data
  // provided, not in the rating". Show an unranked badge instead of the score chip.
  const unranked = createMemo<boolean>(() => {
    const r = stats()?.rating;
    return !!r && compositeValue() == null && (r.rating_breakdown?.length ?? 0) > 0;
  });
  // Specialist meta-score = the entity's peak SKILL percentile (the is_specialty
  // datapoint's pct), matching the SpecialistCard hero — NOT rating_specialist_rank
  // (peak-z-among-peers), which reads confusingly low next to the per-skill pcts.
  const specialistRank = createMemo<number | null>(() => {
    const peak = stats()?.rating?.rating_breakdown?.find((d) => d.is_specialty);
    return peak?.pct ?? null;
  });

  const vibeScore = createMemo<number | null>(() => {
    const v = vibe()?.current;
    if (!v || v.score == null) return null;
    return Math.round(v.score as number);
  });

  return (
    <div class="pw-body">
      <Suspense
        fallback={
          <div class="pw-loading">
            <Skeleton shape="circle" width={64} height={64} />
            <Skeleton shape="line" width={180} />
            <Skeleton shape="line" width={120} />
          </div>
        }
      >
        {/* Inside Suspense: entity() throws while loading (caught by
            Suspense → fallback shows). After resolution it's the real
            value or null (no entity found). */}
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
              <Show when={logoUrl()}>
                <img
                  src={logoUrl()}
                  alt={resolved().name}
                  class="pw-logo"
                  loading="lazy"
                />
              </Show>
              <h2 class="pw-name">{resolved().name}</h2>
              {/* Players: the season-aware team, linked to its profile. Teams (or
                  team-less players): the plain subtitle (city). */}
              <Show
                when={type() === "player" && playerTeam()}
                fallback={
                  <Show when={resolved().subtitle}>
                    <p class="pw-subtitle">{resolved().subtitle}</p>
                  </Show>
                }
              >
                {(t) => (
                  <p class="pw-subtitle">
                    <a class="pw-subtitle-link" href={teamHref(t().id)}>{t().name}</a>
                  </p>
                )}
              </Show>
              {/* The three pillar scores — Composite | Specialist | Vibe —
                  directly under the image, above the metadata. Each cell is
                  wrapped in ErrorBoundary + Suspense so one source's outage
                  hides only that cell, not the whole card. */}
              <div class="pw-scores">
                <ErrorBoundary fallback={null}>
                  <Suspense>
                    <Show when={compositeValue() != null}>
                      <div class="pw-score-item">
                        <span
                          class="pw-score-value"
                          style={{ color: type() === "team" ? tierColor(compositeValue()!) : tierColorScore(compositeValue()!) }}
                        >
                          {type() === "team" ? String(compositeValue()!) : compositeValue()!.toFixed(1)}
                        </span>
                        <span class="pw-score-label">{pillarLabel("composite", type())}</span>
                      </div>
                    </Show>
                    <Show when={unranked()}>
                      <div class="pw-score-item">
                        <span class="pw-score-value pw-score-unranked">—</span>
                        <span class="pw-score-label">Unranked · low min</span>
                      </div>
                    </Show>
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary fallback={null}>
                  <Suspense>
                    <Show when={type() === "player" && specialistRank() != null}>
                      <div class="pw-score-item">
                        <span class="pw-score-value" style={{ color: tierColor(specialistRank()!) }}>
                          {specialistRank()!.toFixed(1)}
                        </span>
                        <span class="pw-score-label">{pillarLabel("sigil", type())}</span>
                      </div>
                    </Show>
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary fallback={null}>
                  <Suspense>
                    <Show when={vibeScore() != null}>
                      <div class="pw-score-item">
                        <span class="pw-score-value" style={{ color: tierColor(vibeScore()!) }}>
                          {vibeScore()}
                        </span>
                        <span class="pw-score-label">{pillarLabel("vibes", type())}</span>
                      </div>
                    </Show>
                  </Suspense>
                </ErrorBoundary>
              </div>
              <div class="pw-details">
                <For each={resolved().details}>
                  {(detail) => (
                    <div class="pw-detail-item">
                      <span class="pw-detail-label">{detail.label}</span>
                      <span class="pw-detail-value">{detail.value}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
