/**
 * TrendsCard — combined statistical + narrative recency for the active entity.
 *
 * Reads the /trends endpoint (see scoracle-backend/ENDPOINTS.md §Trends).
 * Layout: one locked Shell with two sections stacked vertically — vibes
 * on top, stats below, separated by a horizontal hairline.
 *
 *   ┌─────────────────────────────────────┐
 *   │ VIBES · LAST 7 DAYS                 │
 *   │ today    89                         │
 *   │ 1d ago   81                         │
 *   │ …                                   │
 *   ├─────────────────────────────────────┤
 *   │ STATS · LAST 3 GAMES                │
 *   │ KR TDs       0.33    vs 0.16        │
 *   │ Turnovers    0.00    vs 0.05        │
 *   │ …                                   │
 *   └─────────────────────────────────────┘
 *
 * The recent stat value is tier-colored against the 5-step antique-tarot
 * palette via `tierColorFromDelta` (positive direction = green/blue,
 * negative = red/orange). The peer baseline is the same number cohort
 * peers averaged over their season — concrete context the user can
 * compare against. **No percentage delta is shown**: percent change off
 * tiny baselines (a `+107%` jump from 0.16 → 0.33) reads as noise, and
 * `−100%` off a zero recent value is mathematically undefined. Tier
 * color + raw values do the same job without the misleading number.
 *
 * Vibe scores use the same 5-step palette via `tierColor` so a "73" on
 * either surface reads the same green-blue.
 *
 * Empty branches:
 *   - games_used: 0  OR peer_cohort_size < 5 → hide stats section
 *   - vibes.snapshots: []                    → hide vibes section
 *   - both empty                             → render <EmptyCard/>
 */

import { createMemo, Show, For } from "solid-js";
import { createAsync } from "@solidjs/router";

import { useProfile } from "../../contexts/profile";
import {
  getTrends,
  type TrendsResponse,
  type TrendsVibeSnapshot,
} from "../../lib/data/trends.server";
import {
  tierColor,
  tierColorFromDelta,
  LOWER_IS_BETTER,
} from "../../lib/utils/tier-color";
import { getStatLabel } from "../../lib/utils/stats-categorizer";
import EmptyCard from "./EmptyCard";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./content-cards.css";
import "./TrendsCard.css";

interface StatRow {
  key: string;
  label: string;
  recent: number;
  peer: number;
  delta: number;
  inverted: boolean;
}

const MAX_STAT_ROWS = 5;

function buildStatRows(data: TrendsResponse): StatRow[] {
  const recents = data.entity_recent_avgs;
  const peers = data.peer_season_avgs;
  const rows: StatRow[] = [];
  for (const key of Object.keys(peers)) {
    const peer = peers[key];
    const recent = recents[key];
    if (recent == null || peer == null || peer === 0) continue;
    const delta = (recent - peer) / peer;
    rows.push({
      key,
      label: getStatLabel(key),
      recent,
      peer,
      delta,
      inverted: LOWER_IS_BETTER.has(key),
    });
  }
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = rows.slice(0, MAX_STAT_ROWS);
  // Within the top set, sort by signed delta descending so positive
  // movers appear at the top — the "what's hot" reading order.
  top.sort((a, b) => {
    const da = a.inverted ? -a.delta : a.delta;
    const db = b.inverted ? -b.delta : b.delta;
    return db - da;
  });
  return top;
}

function formatStatValue(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/** UTC-day index of an ISO timestamp. Used for day-difference labeling so
 *  SSR and client agree regardless of viewer timezone. */
function utcDay(iso: string): number {
  const d = new Date(iso);
  return Math.floor(d.getTime() / 86_400_000);
}

function dayLabel(snapshot: TrendsVibeSnapshot, anchorIso: string, index: number): string {
  if (index === 0) return "today";
  const diff = utcDay(anchorIso) - utcDay(snapshot.generated_at);
  if (diff <= 0) return "today";
  if (diff === 1) return "1d ago";
  return `${diff}d ago`;
}

export default function TrendsCard() {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  const data = createAsync(() => getTrends(sport, type, id, ctx.season()));

  const showStats = createMemo(() => {
    const d = data();
    if (!d) return false;
    return d.window.games_used > 0 && d.peer_cohort_size >= 5;
  });

  const statRows = createMemo<StatRow[]>(() => {
    const d = data();
    if (!d || !showStats()) return [];
    return buildStatRows(d);
  });

  const showVibes = createMemo(() => (data()?.vibes.snapshots.length ?? 0) > 0);

  const isEmpty = createMemo(() => {
    const d = data();
    if (!d) return true;
    return statRows().length === 0 && !showVibes();
  });

  const statsRange = createMemo(() => {
    const d = data();
    if (!d) return "Last 3 Games";
    return d.window.spans_prior_season
      ? "Last 3 Games (spans prior season)"
      : "Last 3 Games";
  });

  return (
    <Show when={data()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty()} fallback={<EmptyCard />}>
          <Shell as="article" class="trends-card-shell" aria-label="Trends">
            <div class="trends-card">
              <Show when={showVibes()}>
                <section class="trends-section trends-section-vibes" aria-label="Vibe trend">
                  <h3 class="trends-section-label">
                    <span class="trends-section-type">Vibes</span>
                    <span class="trends-section-range"> · Last 7 Days</span>
                  </h3>
                  <ul class="trends-rows">
                    <For each={data()!.vibes.snapshots}>
                      {(snap, i) => (
                        <li class="trends-row trends-vibe-row">
                          <span class="trends-vibe-day">
                            {dayLabel(snap, data()!.vibes.snapshots[0].generated_at, i())}
                          </span>
                          <span
                            class="trends-vibe-score"
                            style={{ color: tierColor(snap.sentiment) }}
                          >
                            {snap.sentiment}
                          </span>
                        </li>
                      )}
                    </For>
                  </ul>
                </section>
              </Show>

              <Show when={showStats() && statRows().length > 0 && showVibes()}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showStats() && statRows().length > 0}>
                <section class="trends-section trends-section-stats" aria-label="Stat trend">
                  <h3 class="trends-section-label">
                    <span class="trends-section-type">Stats</span>
                    <span class="trends-section-range"> · {statsRange()}</span>
                  </h3>
                  <ul class="trends-rows">
                    <For each={statRows()}>
                      {(row) => {
                        const color = tierColorFromDelta(row.delta, row.inverted);
                        return (
                          <li class="trends-row trends-stat-row">
                            <span class="trends-stat-key">{row.label}</span>
                            <span class="trends-stat-value" style={{ color }}>
                              {formatStatValue(row.recent)}
                            </span>
                            <span class="trends-stat-peer">
                              vs {formatStatValue(row.peer)}
                            </span>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </section>
              </Show>
            </div>
          </Shell>
        </Show>
      )}
    </Show>
  );
}

export function TrendsCardSkeleton() {
  return (
    <Shell as="article" class="trends-card-shell" aria-label="Trends">
      <div class="trends-card">
        <section class="trends-section">
          <Skeleton shape="line" width={160} height={12} />
          <div class="card-loading">
            <For each={[1, 2, 3, 4]}>
              {() => <Skeleton shape="line" width="100%" height={18} />}
            </For>
          </div>
        </section>
        <div class="trends-divider" aria-hidden="true" />
        <section class="trends-section">
          <Skeleton shape="line" width={160} height={12} />
          <div class="card-loading">
            <For each={[1, 2, 3, 4, 5]}>
              {() => <Skeleton shape="line" width="100%" height={18} />}
            </For>
          </div>
        </section>
      </div>
    </Shell>
  );
}
