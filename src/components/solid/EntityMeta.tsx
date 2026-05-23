/**
 * EntityMeta — Unified player/team meta widget (Solid.js)
 *
 * Reads sport/type/id from ProfileContext. Pure meta-display widget —
 * no UI state, no toggle. EntityMeta is the MetaShell of the three-Shell
 * profile stack (MetaShell → TabShell → ContentShell); the news/stats
 * tab navigation lives in TabShell, not here.
 *
 * Data flow: same `createAsync` / `query()` shape as the rest of the
 * platform. `getEntityMeta` is a client-side query (the underlying
 * data is bundled JSON served by Workers Static Assets — no
 * round-trip to the API). `query()` dedupes calls for the same
 * (sport, type, id).
 *
 * SSR: the fetcher returns `null` on the server; the SSR HTML ships
 * the loading skeleton, the client hydrates and resolves real data.
 */

import { Suspense, createEffect, createMemo, ErrorBoundary, Show, For } from "solid-js";
import { isServer } from "solid-js/web";
import { createAsync, query } from "@solidjs/router";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import { getPositionGroup } from "../../lib/utils/position-groups";
import {
  formatAgeFromDob,
  formatHeightForDisplay,
  formatWeightForDisplay,
} from "../../lib/utils/player-metrics";
import {
  categorizeForCharts,
  pickPercentiles,
} from "../../lib/utils/stats-categorizer";
import { tierColor } from "../../lib/utils/tier-color";
import { getStats } from "../../lib/data/stats.server";
import { getVibe } from "../../lib/data/vibe.server";
import { setEntityInfo } from "../../stores/entity";
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

interface ResolvedMeta {
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

function buildTeamDetails(meta: TeamMeta): Detail[] {
  const details: Detail[] = [];

  if (meta.league?.name) details.push({ label: "League", value: meta.league.name });
  if (meta.country) details.push({ label: "Country", value: meta.country });
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

function resolveTeam(meta: TeamMeta): ResolvedMeta {
  return {
    name: meta.name || "Unknown Team",
    subtitle: meta.city || "",
    logoUrl: meta.logo_url || "",
    details: buildTeamDetails(meta),
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
  return meta ? resolveTeam(meta) : null;
}

async function fetchEntityMeta(
  sport: string,
  type: EntityType,
  id: string,
): Promise<ResolvedMeta | null> {
  if (isServer) return null;
  // Sync first — if the meta JSON is already preloaded, this is instant.
  const sync = readMetaSync(sport, type, id);
  if (sync) return sync;
  // Async fallback: load the sport's meta DB, then read sync.
  await entityDataStore.loadMeta(sport).catch(() => {});
  return readMetaSync(sport, type, id);
}

const getEntityMeta = query(fetchEntityMeta, "entity-meta");

// ─── Component ──────────────────────────────────────────────────────────────

export default function EntityMeta() {
  const ctx = useProfile();

  // Bail out on malformed URLs (no entity to render).
  if (!ctx.sport || !ctx.id) return null;

  // Entity ID drives the corner-numeral slot — sport/type/id come from
  // ProfileContext synchronously, so the prop can land at mount without
  // waiting on async meta resolution.
  return (
    <Shell class="meta-widget" cornerLabel={ctx.id} aria-label="Entity">
      <EntityMetaBody />
    </Shell>
  );
}

function EntityMetaBody() {
  const ctx = useProfile();

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  const entity = createAsync(() => getEntityMeta(sport, type, id));

  // Lazy cross-card aggregates: each resolves via the same query() cache
  // that StatsCard / VibeCard use, so they piggyback on the route's
  // preload and land warm. Each readout below sits inside its own
  // <Suspense> so it pops in without blocking the meta render.
  const stats = createAsync(() => getStats(sport, type, id));
  const vibe = createAsync(() => getVibe(sport, type, id));

  // Macro average across categories: each populated chart slot (>=2
  // percentiled stats) contributes its own average, then those category
  // averages are averaged. Mirrors the per-card "Overall score: N"
  // readout — averaging those numbers themselves rather than re-pooling
  // every percentile, so each category counts equally.
  //
  // For NFL position-aware players (`receiver`, `running-back`, `quarterback`,
  // defenders, special teams), `categorizeForCharts` returns a single
  // position-specific category — passing the positionGroup makes the meta
  // score collapse to that category's average, which is exactly the number
  // shown under the positional pizza on StatsCard. Without this, NFL players
  // would fall through to the generic 5-slot config and disagree with their
  // own positional readout.
  const overallScore = createMemo<number | null>(() => {
    const d = stats();
    if (!d?.stats) return null;
    const percentiles = pickPercentiles(d, "all");
    const rawPosition =
      d?.percentile_metadata?.position_group ??
      d?.scoped_percentile_metadata?.position_group ??
      null;
    const positionGroup = getPositionGroup(sport, rawPosition);
    const cats = categorizeForCharts(d.stats, percentiles, sport, type, positionGroup);
    const catAverages: number[] = [];
    for (const cat of cats) {
      let sum = 0;
      let count = 0;
      for (const s of cat.stats) {
        if (s.percentile != null) {
          sum += s.percentile;
          count++;
        }
      }
      if (count >= 2) catAverages.push(sum / count);
    }
    if (catAverages.length === 0) return null;
    const total = catAverages.reduce((a, b) => a + b, 0);
    return Math.round(total / catAverages.length);
  });

  const vibeScore = createMemo<number | null>(() => {
    const v = vibe();
    if (!v || v.sentiment == null) return null;
    return Math.round(v.sentiment as number);
  });

  // Publish entity info when data resolves so other islands can read it
  // (e.g., the route's document.title effect, the $entityInfo nanostore).
  createEffect(() => {
    const resolved = entity();
    if (!resolved) return;
    setEntityInfo({
      sport,
      type,
      id,
      name: resolved.name,
      position: resolved.position,
      positionGroup: resolved.positionGroup,
    });
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
              <p>Unable to load {type} data</p>
            </div>
          }
        >
          {(resolved) => (
            <div class="pw-content">
              <Show when={resolved().logoUrl}>
                <img
                  src={resolved().logoUrl}
                  alt={resolved().name}
                  class="pw-logo"
                  loading="lazy"
                />
              </Show>
              <h2 class="pw-name">{resolved().name}</h2>
              <Show when={resolved().subtitle}>
                <p class="pw-subtitle">{resolved().subtitle}</p>
              </Show>
              <div class="pw-details">
                {/* Lazy score readouts: each wrapped in ErrorBoundary +
                    Suspense so a stats/vibe outage hides only that row
                    instead of bubbling up and reverting the whole meta
                    card to its loading skeleton. */}
                <ErrorBoundary fallback={null}>
                  <Suspense>
                    <Show when={overallScore() != null}>
                      <div class="pw-detail-item">
                        <span class="pw-detail-label">Overall</span>
                        <span
                          class="pw-detail-value"
                          style={{ color: tierColor(overallScore()!) }}
                        >
                          {overallScore()}
                        </span>
                      </div>
                    </Show>
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary fallback={null}>
                  <Suspense>
                    <Show when={vibeScore() != null}>
                      <div class="pw-detail-item">
                        <span class="pw-detail-label">Vibe</span>
                        <span
                          class="pw-detail-value"
                          style={{ color: tierColor(vibeScore()!) }}
                        >
                          {vibeScore()}
                        </span>
                      </div>
                    </Show>
                  </Suspense>
                </ErrorBoundary>
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
