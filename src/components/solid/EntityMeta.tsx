/**
 * EntityMeta — Unified player/team meta widget (Solid.js)
 *
 * Replaces both PlayerMetaWidget.astro and TeamMetaWidget.astro with a
 * single component. Reads the entity (sport/type/id) and the active view
 * from ProfileContext; the toggle calls `ctx.setView(...)` directly to
 * drive the card flip — no CustomEvent bridge.
 *
 * Hydration chain:
 *   1. Sync from local EntityDataStore (instant if preloaded)
 *   2. Async fallback: load meta DB, then retry sync
 *
 * SSR: the createResource source is gated on `!isServer`, so the SSR
 * shell renders the loading skeleton and the meta load happens after
 * client hydration. Solid's JSX layer auto-escapes text.
 */

import { createEffect, createResource, Show, For } from "solid-js";
import { isServer } from "solid-js/web";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import { getPositionGroup } from "../../lib/utils/position-groups";
import {
  formatAgeFromDob,
  formatHeightForDisplay,
  formatWeightForDisplay,
} from "../../lib/utils/player-metrics";
import { setEntityInfo } from "../../stores/entity";
import { useProfile } from "../../contexts/profile";
import type { PlayerMeta, TeamMeta } from "../../lib/types";
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function EntityMeta() {
  const ctx = useProfile();

  // Bail out on malformed URLs (no entity to render).
  if (!ctx.sport || !ctx.id) return null;

  const sport = ctx.sport;
  const id = ctx.id;
  const type = ctx.type;

  function getMetaSync(): ResolvedMeta | null {
    if (type === "player") {
      const meta = entityDataStore.getPlayerMetaSync(sport, id);
      return meta ? resolvePlayer(meta, sport) : null;
    }
    const meta = entityDataStore.getTeamMetaSync(sport, id);
    return meta ? resolveTeam(meta) : null;
  }

  async function fetchMeta(): Promise<ResolvedMeta | null> {
    const syncResult = getMetaSync();
    if (syncResult) return syncResult;

    await entityDataStore.loadMeta(sport);
    return getMetaSync();
  }

  // Source gate: stays falsy on SSR (skeleton renders), flips truthy on
  // client so the fetch fires after hydration.
  const [entity] = createResource(() => !isServer, fetchMeta);

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
    <div class="meta-widget card">
      <div class="pw-body">
        {/* Loading state */}
        <Show
          when={!entity.loading && entity() !== undefined}
          fallback={
            <div class="pw-loading">
              <div class="skeleton-circle" />
              <div class="skeleton-line" />
              <div class="skeleton-line short" />
            </div>
          }
        >
          {/* Error / null state */}
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
                <Show when={resolved().details.length > 0}>
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
                </Show>
              </div>
            )}
          </Show>
        </Show>
      </div>

      {/* View toggle */}
      <div class="pw-view-toggle">
        <button
          class="pw-toggle-btn"
          classList={{ active: ctx.view() === "news" }}
          onClick={() => ctx.setView("news")}
        >
          Recent News
        </button>
        <button
          class="pw-toggle-btn"
          classList={{ active: ctx.view() === "stats" }}
          onClick={() => ctx.setView("stats")}
        >
          Statistical Profile
        </button>
      </div>
    </div>
  );
}
