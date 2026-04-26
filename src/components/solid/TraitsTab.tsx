/**
 * TraitsTab — Strengths & weaknesses display (Solid.js)
 *
 * Pure derivation from $statsData (published by StatsTab). No fetch of
 * its own. The memo recomputes whenever StatsTab revalidates via SWR,
 * so a stale-then-fresh stats round trip updates the trait list live.
 */

import { createMemo, Show, For } from 'solid-js';
import { useStore } from '@nanostores/solid';

import { $statsData } from '../../stores/stats';
import type { Category } from '../../lib/utils/stats-categorizer';
import './content-tabs.css';
import './TraitsTab.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TraitItem {
  key: string;
  label: string;
  value: number | string | null;
  percentile: number;
  indicator: string;
  count: number;
  type: 'strength' | 'weakness';
}

// ─── Logic ──────────────────────────────────────────────────────────────────

function getIndicator(percentile: number): { symbol: string; count: number; type: 'strength' | 'weakness' } | null {
  if (percentile >= 90) return { symbol: '+', count: 4, type: 'strength' };
  if (percentile >= 80) return { symbol: '+', count: 3, type: 'strength' };
  if (percentile >= 70) return { symbol: '+', count: 2, type: 'strength' };
  if (percentile <= 10) return { symbol: '-', count: 4, type: 'weakness' };
  if (percentile <= 20) return { symbol: '-', count: 3, type: 'weakness' };
  if (percentile <= 30) return { symbol: '-', count: 2, type: 'weakness' };
  return null;
}

function extractTraits(categories: Category[]): { strengths: TraitItem[]; weaknesses: TraitItem[] } {
  const strengths: TraitItem[] = [];
  const weaknesses: TraitItem[] = [];

  for (const cat of categories) {
    for (const stat of cat.stats) {
      if (stat.percentile === undefined || stat.percentile === null) continue;
      const ind = getIndicator(stat.percentile);
      if (!ind) continue;

      const item: TraitItem = {
        key: stat.key, label: stat.label, value: stat.value,
        percentile: stat.percentile, indicator: ind.symbol, count: ind.count, type: ind.type,
      };

      if (ind.type === 'strength') strengths.push(item);
      else weaknesses.push(item);
    }
  }

  strengths.sort((a, b) => b.percentile - a.percentile);
  weaknesses.sort((a, b) => a.percentile - b.percentile);
  return { strengths, weaknesses };
}

function formatValue(value: number | string | null): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    if (value > 0 && value < 1) return (value * 100).toFixed(1) + '%';
    if (!Number.isInteger(value)) return value.toFixed(1);
  }
  return String(value);
}

// ─── Component ──────────────────────────────────────────────────────────────

// `active` prop is part of the TabContainer contract but TraitsTab has
// nothing to lazy-load (no fetch of its own). Reading it would force an
// inactive subscription; ignore it.
export default function TraitsTab(_props: { active: () => boolean }) {
  const stats = useStore($statsData);

  const traits = createMemo(() => {
    const s = stats();
    if (!s?.categories?.length) return null;
    return extractTraits(s.categories);
  });

  function TraitList(props: { items: TraitItem[]; emptyMsg: string }) {
    return (
      <div class="sw-list">
        <Show when={props.items.length > 0} fallback={
          <p class="sw-none">{props.emptyMsg}</p>
        }>
          <For each={props.items}>
            {(item) => (
              <div class="sw-item">
                <div class="sw-item-info">
                  <span class="sw-item-label">{item.label}</span>
                  <span class="sw-item-value">{formatValue(item.value)}</span>
                </div>
                <div class={`sw-item-indicator ${item.type}`}>
                  {item.indicator.repeat(item.count)}
                  <span class="sw-item-percentile">{Math.round(item.percentile)}%</span>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    );
  }

  return (
    <div class="sw-body">
      <Show
        when={traits()}
        fallback={
          <div class="sw-loading">
            <div class="sw-skeleton-section">
              <div class="skeleton-header" />
              <div class="tab-skeleton-item" /><div class="tab-skeleton-item" /><div class="tab-skeleton-item" />
            </div>
            <div class="sw-skeleton-section">
              <div class="skeleton-header" />
              <div class="tab-skeleton-item" /><div class="tab-skeleton-item" />
            </div>
          </div>
        }
      >
        {(result) => (
          <div class="sw-content">
            <div class="sw-section">
              <div class="section-header">
                <span class="section-icon strength-icon">+</span>
                <h4 class="section-title">Strengths</h4>
              </div>
              <TraitList items={result().strengths} emptyMsg="No notable strengths" />
            </div>
            <div class="sw-section">
              <div class="section-header">
                <span class="section-icon weakness-icon">-</span>
                <h4 class="section-title">Weaknesses</h4>
              </div>
              <TraitList items={result().weaknesses} emptyMsg="No notable weaknesses" />
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
