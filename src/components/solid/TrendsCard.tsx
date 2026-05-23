/**
 * TrendsCard — combined statistical + narrative recency for the active entity.
 *
 * Reads the /trends endpoint (see scoracle-backend/ENDPOINTS.md §Trends).
 * Layout: two columns inside one locked Shell.
 *
 *   LAST 3 GAMES (left)          LAST 7 DAYS (right)
 *   ───────────────────          ───────────────────
 *   PTS   28.3   +48%            today    80
 *   AST    6.4   +60%            1d ago   78
 *   …                            …
 *
 * All numbers are tier-colored against the 5-step antique-tarot palette
 * via lib/utils/tier-color — stat values pick a tier from their signed
 * delta vs. the peer cohort season average; vibe scores pick a tier
 * directly from the raw 1-100 value. Same palette as VibeCard so a "73"
 * on either surface reads the same green-blue.
 *
 * Empty branches:
 *   - games_used: 0  OR peer_cohort_size < 5 → hide left column
 *   - vibes.snapshots: []                    → hide right column
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

function formatDelta(delta: number): string {
  const pct = Math.round(delta * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `−${Math.abs(pct)}%`;
  return "0%";
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

  const data = createAsync(() => getTrends(sport, type, id));

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

  const statsHeader = createMemo(() => {
    const d = data();
    if (!d) return "LAST 3 GAMES";
    return d.window.spans_prior_season
      ? "LAST 3 GAMES (spans prior season)"
      : "LAST 3 GAMES";
  });

  const cohortCaption = createMemo(() => {
    const d = data();
    if (!d) return "";
    const pos = d.meta.position;
    const n = d.peer_cohort_size;
    if (type === "team") return `Cohort · n=${n}`;
    return pos ? `${pos}s · n=${n}` : `Cohort · n=${n}`;
  });

  return (
    <Show when={data()} fallback={<EmptyCard />}>
      {(_d) => (
        <Show when={!isEmpty()} fallback={<EmptyCard />}>
          <Shell as="article" class="trends-card-shell" aria-label="Trends">
            <div
              class="trends-card"
              classList={{
                "trends-single-col": !(showStats() && statRows().length > 0 && showVibes()),
              }}
            >
              <Show when={showStats() && statRows().length > 0}>
                <section class="trends-col trends-col-stats" aria-label="Stat trend">
                  <h3 class="trends-col-label">{statsHeader()}</h3>
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
                            <span class="trends-stat-delta" style={{ color }}>
                              {formatDelta(row.delta)}
                            </span>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                  <p class="trends-col-footer">{cohortCaption()}</p>
                </section>
              </Show>

              <Show when={showStats() && statRows().length > 0 && showVibes()}>
                <div class="trends-divider" aria-hidden="true" />
              </Show>

              <Show when={showVibes()}>
                <section class="trends-col trends-col-vibes" aria-label="Vibe trend">
                  <h3 class="trends-col-label">LAST 7 DAYS</h3>
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
                  <p class="trends-col-footer">newest first</p>
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
        <section class="trends-col">
          <Skeleton shape="line" width={120} height={12} />
          <div class="card-loading">
            <For each={[1, 2, 3, 4, 5]}>
              {() => <Skeleton shape="line" width="100%" height={18} />}
            </For>
          </div>
        </section>
        <div class="trends-divider" aria-hidden="true" />
        <section class="trends-col">
          <Skeleton shape="line" width={120} height={12} />
          <div class="card-loading">
            <For each={[1, 2, 3, 4, 5, 6, 7]}>
              {() => <Skeleton shape="line" width="100%" height={18} />}
            </For>
          </div>
        </section>
      </div>
    </Shell>
  );
}
