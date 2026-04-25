/**
 * EntityMeta — Unified player/team meta widget (Solid.js island)
 *
 * Replaces both PlayerMetaWidget.astro and TeamMetaWidget.astro with a
 * single component. The `type` prop controls which fields are displayed.
 *
 * Hydration chain:
 *   1. Sync from local EntityDataStore (instant if preloaded)
 *   2. Async fallback: load meta DB, then retry sync
 *
 * Cross-component communication:
 *   - Publishes to $entityInfo nanostore (for Solid consumers)
 *   - Sets pageData('widget') (for XTab entity-name resolution)
 *   - Dispatches profile:viewchange CustomEvent (consumed by routes/profile.tsx)
 *   - Listens for profile:setview CustomEvent (deep-link from profile route)
 *
 * SSR note: this component reads `window.location.search` at setup, so
 * it must be consumed via `clientOnly` from `@solidjs/start`. The route
 * is responsible for the wrapper. See routes/profile.tsx.
 */

import { createSignal, createEffect, createResource, onMount, onCleanup, Show, For } from 'solid-js';
import { isServer } from 'solid-js/web';
import { entityDataStore } from '../../lib/utils/entity-data-store';
import { setPageData } from '../../lib/utils/api-fetcher';
import { getPositionGroup } from '../../lib/utils/position-groups';
import { formatAgeFromDob, formatHeightForDisplay, formatWeightForDisplay } from '../../lib/utils/player-metrics';
import { setEntityInfo } from '../../stores/entity';
import type { EntityType, PlayerMeta, TeamMeta } from '../../lib/types';
import './EntityMeta.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EntityMetaProps {
  type: EntityType;
}

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

function buildPlayerDetails(meta: PlayerMeta): Detail[] {
  const details: Detail[] = [];

  if (meta.detailed_position || meta.position) {
    details.push({ label: 'Position', value: meta.detailed_position || meta.position! });
  }
  if (meta.jersey_number) {
    details.push({ label: 'Number', value: `#${meta.jersey_number}` });
  }

  const height = formatHeightForDisplay(meta.height);
  if (height) details.push({ label: 'Height', value: height });

  const weight = formatWeightForDisplay(meta.weight);
  if (weight) details.push({ label: 'Weight', value: weight });

  const age = formatAgeFromDob(meta.date_of_birth);
  if (age) details.push({ label: 'Age', value: age });

  if (meta.college) details.push({ label: 'College', value: meta.college });
  if (meta.draft_year) details.push({ label: 'Draft', value: String(meta.draft_year) });
  if (meta.birth_country) details.push({ label: 'Country', value: meta.birth_country });
  else if (meta.nationality) details.push({ label: 'Nationality', value: meta.nationality });
  if (meta.league?.name) details.push({ label: 'League', value: meta.league.name });

  return details;
}

function buildTeamDetails(meta: TeamMeta): Detail[] {
  const details: Detail[] = [];

  if (meta.league?.name) details.push({ label: 'League', value: meta.league.name });
  if (meta.country) details.push({ label: 'Country', value: meta.country });
  if (meta.conference) details.push({ label: 'Conference', value: meta.conference });
  if (meta.division) details.push({ label: 'Division', value: meta.division });
  if (meta.founded) details.push({ label: 'Founded', value: String(meta.founded) });
  if (meta.venue_name) details.push({ label: 'Venue', value: meta.venue_name });
  if (meta.venue_capacity) details.push({ label: 'Capacity', value: meta.venue_capacity.toLocaleString() });

  return details;
}

// ─── Data resolution ────────────────────────────────────────────────────────

function resolvePlayer(meta: PlayerMeta, sport: string): ResolvedMeta {
  const name = meta.name
    || `${meta.first_name || ''} ${meta.last_name || ''}`.trim()
    || 'Unknown Player';

  return {
    name,
    subtitle: meta.team?.name || '',
    logoUrl: meta.photo_url || meta.team?.logo_url || '',
    details: buildPlayerDetails(meta),
    position: meta.position,
    positionGroup: getPositionGroup(sport, meta.position),
    raw: meta,
  };
}

function resolveTeam(meta: TeamMeta): ResolvedMeta {
  return {
    name: meta.name || 'Unknown Team',
    subtitle: meta.city || '',
    logoUrl: meta.logo_url || '',
    details: buildTeamDetails(meta),
    raw: meta,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EntityMeta(props: EntityMetaProps) {
  // Read URL params (clientOnly consumer guarantees window is defined)
  const params = new URLSearchParams(window.location.search);
  const sport = params.get('sport')?.toLowerCase() || '';
  const urlType = params.get('type') || 'player';
  const id = params.get('id') || '';

  // Don't hydrate if this instance's type doesn't match the URL
  if (urlType !== props.type || !sport || !id) {
    return null;
  }

  // ── View toggle state ─────────────────────────────────────────────────

  const initialView = params.get('view') === 'stats' ? 'stats' : 'news';
  const [activeView, setActiveView] = createSignal<'news' | 'stats'>(initialView);

  // ── Data fetching via createResource ──────────────────────────────────

  async function fetchMeta(): Promise<ResolvedMeta | null> {
    // Try sync first (instant if EntityDataStore already has data)
    const syncResult = getMetaSync();
    if (syncResult) return syncResult;

    // Async fallback: ensure meta DB is loaded for this sport
    await entityDataStore.loadMeta(sport);

    return getMetaSync();
  }

  function getMetaSync(): ResolvedMeta | null {
    if (props.type === 'player') {
      const meta = entityDataStore.getPlayerMetaSync(sport, id);
      return meta ? resolvePlayer(meta, sport) : null;
    } else {
      const meta = entityDataStore.getTeamMetaSync(sport, id);
      return meta ? resolveTeam(meta) : null;
    }
  }

  const [entity] = createResource(fetchMeta);

  // ── Publish entity info when data resolves ────────────────────────────

  createEffect(() => {
    const resolved = entity();
    if (!resolved) return;

    // Nanostore (for Solid consumers)
    setEntityInfo({
      sport,
      type: props.type,
      id,
      name: resolved.name,
      position: resolved.position,
      positionGroup: resolved.positionGroup,
    });

    // Publish widget data so XTab (and future consumers) can resolve the entity name.
    setPageData('widget', {
      entity_id: resolved.raw.id,
      entity_type: props.type,
      sport,
      info: resolved.raw,
    });
  });

  // ── View toggle handler ───────────────────────────────────────────────

  function onViewToggle(view: 'news' | 'stats') {
    setActiveView(view);
    // Bridge to the route's flip-card handler.
    window.dispatchEvent(new CustomEvent('profile:viewchange', { detail: { view } }));
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  onMount(() => {
    // Listen for programmatic view changes (e.g., deep-link from the route)
    const onSetView = ((e: CustomEvent) => {
      const view = e.detail.view === 'stats' ? 'stats' : 'news';
      setActiveView(view as 'news' | 'stats');
    }) as EventListener;

    window.addEventListener('profile:setview', onSetView);
    onCleanup(() => {
      // Defensive isServer guard. The onCleanup is nested in onMount so it
      // only registers on the client today, but the explicit guard keeps
      // future maintainers from flipping that nesting and tripping SSR.
      if (isServer) return;
      window.removeEventListener('profile:setview', onSetView);
    });
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div class="meta-widget card">
      <div class="pw-body">
        {/* Loading state */}
        <Show when={!entity.loading && entity() !== undefined} fallback={
          <div class="pw-loading">
            <div class="skeleton-circle" />
            <div class="skeleton-line" />
            <div class="skeleton-line short" />
          </div>
        }>
          {/* Error state */}
          <Show when={entity()} fallback={
            <div class="pw-error">
              <p>Unable to load {props.type} data</p>
            </div>
          }>
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
          classList={{ active: activeView() === 'news' }}
          onClick={() => onViewToggle('news')}
        >
          Recent News
        </button>
        <button
          class="pw-toggle-btn"
          classList={{ active: activeView() === 'stats' }}
          onClick={() => onViewToggle('stats')}
        >
          Statistical Profile
        </button>
      </div>
    </div>
  );
}
