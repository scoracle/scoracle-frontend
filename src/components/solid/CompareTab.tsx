/**
 * CompareTab — Search same-sport, same-type entities and render a
 * side-by-side pizza chart comparison. Replaces the old SimilarityTab
 * (the legacy ComparisonSearchModal triad was dropped — see plan
 * refinement 2026-04-25).
 *
 * Candidates come from the preloaded entityDataStore — scoped to the
 * primary entity's sport and entity type, excluding the primary itself.
 * Selection triggers a stats fetch for the compare entity (the primary's
 * stats are already cached by StatsTab via swrFetch).
 */

import {
  createSignal, createMemo, createEffect, createResource,
  Show, For, batch,
} from 'solid-js';

import { swrFetch, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import { entityUrl, unwrapEntityPayload } from '../../lib/utils/data-sources';
import { parseEntityParams } from '../../lib/utils/dom';
import { entityDataStore } from '../../lib/utils/entity-data-store';
import { resolveComparisonPalette } from '../../lib/utils/entity-colors';
import {
  categorizeForCharts,
  categorizeRateForCharts,
  getRateLabel,
  type Category,
} from '../../lib/utils/stats-categorizer';
import type { AutocompleteEntity, EntityType } from '../../lib/types';
import PizzaChart, { type PizzaChartStat, type ComparisonEntityData } from './PizzaChart';
import './content-tabs.css';
import './CompareTab.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatsResponse {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  stats: Record<string, number | string> | null;
  percentiles: Record<string, number> | Array<{ stat_key: string; percentile: number }> | null;
}

interface CompareTabProps {
  entityType: EntityType;
  active: () => boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAX_SUGGESTIONS = 8;
const MIN_QUERY_LENGTH = 2;

function fuzzyMatch(text: string, queryTokens: string[]): boolean {
  const textTokens = text.toLowerCase().split(/\s+/);
  return queryTokens.every(qt => textTokens.some(tt => tt.startsWith(qt)));
}

function normalizePercentiles(
  percentiles: StatsResponse['percentiles'],
): Record<string, number> {
  if (!percentiles) return {};
  if (Array.isArray(percentiles)) {
    const result: Record<string, number> = {};
    for (const p of percentiles) {
      if (p.stat_key && typeof p.percentile === 'number') result[p.stat_key] = p.percentile;
    }
    return result;
  }
  return percentiles;
}

function categoryToChartStats(category: Category): PizzaChartStat[] {
  const out: PizzaChartStat[] = [];
  for (const s of category.stats) {
    if (s.percentile !== undefined && s.percentile !== null) {
      out.push({
        key: s.key,
        label: s.label,
        value: s.value ?? '-',
        percentile: s.percentile,
        categoryId: category.id,
      });
    }
  }
  return out;
}

function displayName(entity: { name: string; first_name?: string; last_name?: string }, sport: string): string {
  if (sport.toUpperCase() === 'FOOTBALL' && entity.first_name && entity.last_name) {
    return `${entity.first_name} ${entity.last_name}`;
  }
  return entity.name;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompareTab(props: CompareTabProps) {
  const params = parseEntityParams();
  if (!params.sport || !params.type || !params.id) return null;
  if (params.type !== props.entityType) return null;

  const sport = params.sport.toLowerCase();
  const primaryId = params.id;

  const isActive = () => props.active();
  const [shouldLoad, setShouldLoad] = createSignal(false);

  createEffect(() => {
    if (isActive() && !shouldLoad()) setShouldLoad(true);
  });

  // ── Candidate pool ─────────────────────────────────────────────────────

  const [candidates, setCandidates] = createSignal<AutocompleteEntity[]>([]);

  createEffect(() => {
    if (!shouldLoad()) return;
    entityDataStore.getEntities(sport).then(list => {
      setCandidates(list.filter(e => e.type === props.entityType && e.id !== primaryId));
    }).catch(() => {});
  });

  // ── Search state ───────────────────────────────────────────────────────

  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = createSignal<AutocompleteEntity | null>(null);

  let inputRef!: HTMLInputElement;

  const suggestions = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (q.length < MIN_QUERY_LENGTH) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return candidates()
      .filter(item => {
        const name = item.name.toLowerCase();
        if (name.includes(q)) return true;
        if (tokens.length > 1 && fuzzyMatch(item.name, tokens)) return true;
        return false;
      })
      .slice(0, MAX_SUGGESTIONS);
  });

  function handleInput() {
    const value = inputRef.value;
    setQuery(value);
    setSelectedIndex(-1);
    setOpen(value.length >= MIN_QUERY_LENGTH);
  }

  function handleFocus() {
    if (query().length >= MIN_QUERY_LENGTH) setOpen(true);
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      setSelectedIndex(-1);
    }, 200);
  }

  function pickEntity(entity: AutocompleteEntity) {
    batch(() => {
      setSelected(entity);
      setQuery('');
      setOpen(false);
      setSelectedIndex(-1);
    });
    if (inputRef) inputRef.value = '';
  }

  function clearSelection() {
    setSelected(null);
  }

  function handleKeydown(e: KeyboardEvent) {
    const sugs = suggestions();
    if (e.key === 'Escape') { setOpen(false); inputRef.blur(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sugs.length > 0) setSelectedIndex(prev => Math.min(prev + 1, sugs.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sugs.length > 0) setSelectedIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = selectedIndex();
      if (idx >= 0 && sugs[idx]) pickEntity(sugs[idx]);
      else if (sugs.length > 0) pickEntity(sugs[0]);
    }
  }

  // ── Stats fetchers ─────────────────────────────────────────────────────

  async function fetchStats(id: string): Promise<StatsResponse | null> {
    const { url, headers } = entityUrl(sport, props.entityType, id);
    const res = await swrFetch<Record<string, unknown>>(url, { ...CACHE_PRESETS.stats, headers });
    const data = unwrapEntityPayload<StatsResponse>(res.data) ?? res.data as unknown as StatsResponse;
    return data?.stats ? data : null;
  }

  const [primary] = createResource(shouldLoad, () => fetchStats(primaryId));
  const [compare] = createResource(selected, (sel) => fetchStats(sel.id));

  // ── Rate toggle (player only, when NBA/FOOTBALL) ───────────────────────

  const rateLabel = createMemo(() => props.entityType === 'player' ? getRateLabel(sport) : null);
  const [showRate, setShowRate] = createSignal(false);

  const primarySlots = createMemo(() => {
    const d = primary();
    if (!d?.stats) return [];
    const pct = normalizePercentiles(d.percentiles);
    return showRate()
      ? categorizeRateForCharts(d.stats, pct, sport)
      : categorizeForCharts(d.stats, pct, sport, props.entityType);
  });

  const compareSlots = createMemo(() => {
    const d = compare();
    if (!d?.stats) return [];
    const pct = normalizePercentiles(d.percentiles);
    return showRate()
      ? categorizeRateForCharts(d.stats, pct, sport)
      : categorizeForCharts(d.stats, pct, sport, props.entityType);
  });

  const hasRateData = createMemo(() => {
    const d = primary();
    if (!d?.stats || props.entityType !== 'player') return false;
    const pct = normalizePercentiles(d.percentiles);
    return categorizeRateForCharts(d.stats, pct, sport)
      .some(c => categoryToChartStats(c).length >= 2);
  });

  const slotPairs = createMemo(() => {
    const p = primarySlots();
    const c = compareSlots();
    return p.map((cat, i) => {
      const primaryStats = categoryToChartStats(cat);
      const compareStats = c[i] ? categoryToChartStats(c[i]) : [];
      return { slot: cat, primaryStats, compareStats };
    });
  });

  // ── Colors ─────────────────────────────────────────────────────────────

  const palette = createMemo(() => {
    const sel = selected();
    if (!sel) return null;
    return resolveComparisonPalette(
      { sport, type: props.entityType, id: primaryId },
      { sport, type: props.entityType, id: sel.id },
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────

  const primaryLabel = () => {
    const d = primary();
    return d ? displayName(d, sport) : 'Primary';
  };

  const compareLabel = () => {
    const s = selected();
    const d = compare();
    if (d) return displayName(d, sport);
    return s?.name || '';
  };

  return (
    <div
      class="compare-tab"
      style={palette() ? {
        '--compare-primary': palette()!.primary,
        '--compare-secondary': palette()!.secondary,
      } : undefined}
    >
      {/* Search row */}
      <Show when={!selected()}>
        <div class="compare-search">
          <input
            ref={inputRef}
            type="text"
            class="compare-search-input"
            placeholder={`Search ${props.entityType}s to compare…`}
            autocomplete="off"
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeydown}
          />
          <Show when={open()}>
            <div class="compare-suggestions">
              <Show when={suggestions().length > 0} fallback={
                <div class="compare-no-results">No results</div>
              }>
                <For each={suggestions()}>
                  {(entity, i) => (
                    <button
                      type="button"
                      class="compare-suggestion"
                      classList={{ selected: selectedIndex() === i() }}
                      tabIndex={-1}
                      onMouseDown={() => pickEntity(entity)}
                    >
                      <span class="compare-suggestion-name">{entity.name}</span>
                      <span class="compare-suggestion-meta">
                        {props.entityType === 'player' ? (entity.team || 'Player') : 'Team'}
                      </span>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* Selected row */}
      <Show when={selected()}>
        {(sel) => (
          <div class="compare-header">
            <div class="compare-vs">
              <span class="compare-entity primary">{primaryLabel()}</span>
              <span class="compare-vs-label">vs</span>
              <span class="compare-entity secondary">{sel().name}</span>
            </div>
            <button type="button" class="compare-clear" onClick={clearSelection}>
              Clear
            </button>
          </div>
        )}
      </Show>

      {/* Rate toggle (player only, when applicable) */}
      <Show when={selected() && props.entityType === 'player' && hasRateData() && rateLabel()}>
        <div class="rate-toggle">
          <button
            class="rate-toggle-btn"
            classList={{ active: !showRate() }}
            onClick={() => setShowRate(false)}
          >
            Per Game
          </button>
          <button
            class="rate-toggle-btn"
            classList={{ active: showRate() }}
            onClick={() => setShowRate(true)}
          >
            {rateLabel()}
          </button>
        </div>
      </Show>

      {/* Loading */}
      <Show when={selected() && (primary.loading || compare.loading)}>
        <div class="tab-loading-skeleton">
          <div class="tab-skeleton-item" />
          <div class="tab-skeleton-item" />
        </div>
      </Show>

      {/* Comparison grid */}
      <Show when={selected() && !primary.loading && !compare.loading}>
        <Show when={primary() && compare()} fallback={
          <div class="tab-empty-state">Unable to load stats for comparison</div>
        }>
          <div class="stats-charts-container stats-charts-grid compare-grid">
            <For each={slotPairs()}>
              {(pair) => {
                const pStats = () => pair.primaryStats;
                const sStats = () => pair.compareStats;
                const secondary = (): ComparisonEntityData => ({
                  name: compareLabel(),
                  stats: sStats(),
                });
                const canRender = () => pStats().length >= 2 || sStats().length >= 2;
                return (
                  <div class="category-chart" classList={{ 'category-chart-empty': !canRender() }}>
                    <p class="category-chart-label">{pair.slot.label}</p>
                    <Show when={canRender()} fallback={
                      <div class="category-chart-placeholder">No data</div>
                    }>
                      <div class="stats-pizza-chart">
                        <PizzaChart
                          stats={pStats()}
                          comparison={secondary()}
                          options={{ width: 260, height: 260, outerRadius: 86, labelOffset: 22 }}
                        />
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Idle hint */}
      <Show when={!selected()}>
        <div class="compare-hint">
          <p>
            Search another {sport.toUpperCase() === 'FOOTBALL' ? 'footballer' : props.entityType}
            {' '}to render a side-by-side pizza comparison.
          </p>
        </div>
      </Show>
    </div>
  );
}
