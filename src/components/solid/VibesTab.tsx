/**
 * VibesTab — Gemma-generated sentiment score (1-100) for the profile entity.
 *
 * Reads from /{sport}/vibe/{type}/{id}. Three states:
 *   - 200 with sentiment number → big emoji + score + randomized blurb
 *   - 200 with sentiment === null → lonely robot + "not enough news" copy
 *   - 404 / fetch error → "model is training" placeholder
 *
 * The frontend owns all presentation: emoji buckets, color, and the
 * randomized flavor blurb. Bucket boundaries match the 5 emoji tiers below.
 */

import { createResource, createMemo, Show } from 'solid-js';

import { swrFetch, CACHE_PRESETS } from '../../lib/utils/api-fetcher';
import { vibeUrl } from '../../lib/utils/data-sources';
import { useProfile } from '../../contexts/profile';
import { formatDate } from '../../lib/utils/date';
import { entityDataStore } from '../../lib/utils/entity-data-store';
import './content-tabs.css';
import './VibesTab.css';

interface VibeRow {
  id: number;
  entity_type: string;
  entity_id: number;
  sport: string;
  trigger_type: string;
  sentiment: number | null;
  model_version: string;
  prompt_version: string;
  generated_at: string;
}

interface Tier {
  emoji: string;
  label: string;
  className: string;
  blurbs: BlurbFn[];
}

type BlurbFn = (name: string, team: string) => string;

// Combine team + name when team is available, else fall back to name alone.
const full = (name: string, team: string) => (team ? `${team} ${name}` : name);

const TIERS: Tier[] = [
  {
    emoji: '😞',
    label: 'Down bad',
    className: 'tier-1',
    blurbs: [
      (n) => `${n} is down bad.`,
      (n) => `Rough stretch for ${n}.`,
      (n, t) => `Critics are piling on ${full(n, t)}.`,
      (n) => `Tough vibes around ${n} right now.`,
      (n) => `${n} can't catch a break.`,
    ],
  },
  {
    emoji: '😟',
    label: 'Cooling off',
    className: 'tier-2',
    blurbs: [
      (n) => `${n} is hearing it from the crowd.`,
      (n, t) => `Fans are skeptical of ${full(n, t)}.`,
      (n) => `${n}'s narrative has cooled off.`,
      (n) => `Mixed signals around ${n}.`,
      (n) => `Something's off with ${n}.`,
    ],
  },
  {
    emoji: '😐',
    label: 'Neutral',
    className: 'tier-3',
    blurbs: [
      (n) => `${n} is just chilling.`,
      (n) => `Quiet news week for ${n}.`,
      (n, t) => `Nothing flashy out of ${full(n, t)}.`,
      (n) => `${n} is steady as it goes.`,
      (n) => `Business as usual for ${n}.`,
    ],
  },
  {
    emoji: '🙂',
    label: 'Trending up',
    className: 'tier-4',
    blurbs: [
      (n, t) => `Buzz is building for ${full(n, t)}.`,
      (n) => `${n} is trending up.`,
      (n) => `Good vibes around ${n}.`,
      (n) => `${n} is making a strong case.`,
      (n, t) => `${full(n, t)} is looking sharp.`,
    ],
  },
  {
    emoji: '🤩',
    label: 'On fire',
    className: 'tier-5',
    blurbs: [
      (n, t) => `People are pumped on ${full(n, t)}!`,
      (n) => `${n} is on fire!`,
      (n, t) => `The ${full(n, t)} hype is real.`,
      (n) => `${n} can do no wrong right now.`,
      (n) => `Everyone's talking about ${n}.`,
    ],
  },
];

function tierForScore(score: number): Tier {
  // 1-20 → tier 1, 21-40 → tier 2, 41-60 → tier 3, 61-80 → tier 4, 81-100 → tier 5.
  const idx = Math.min(4, Math.max(0, Math.floor((score - 1) / 20)));
  return TIERS[idx];
}

function pickBlurb(tier: Tier, name: string, team: string): string {
  const fn = tier.blurbs[Math.floor(Math.random() * tier.blurbs.length)];
  return fn(name || 'this entity', team);
}

export default function VibesTab(props: { active: () => boolean }) {
  const ctx = useProfile();
  const { sport, type, id } = ctx;

  // One-shot latch: stays true once `props.active` has been true at any point.
  const shouldLoad = createMemo<boolean>(prev => prev || props.active(), false);

  async function fetchVibe(): Promise<VibeRow | null> {
    if (!sport || !type || !id) return null;
    // Pre-load the local meta DB so the blurb templating can read entity +
    // team names below. EntityMeta usually beats us to it; the store
    // dedupes so the second call is cheap.
    await entityDataStore.loadMeta(sport).catch(() => {});
    const { url, headers } = vibeUrl(sport, type, id);
    try {
      const { data } = await swrFetch<VibeRow>(url, { ...CACHE_PRESETS.ml, headers });
      return data ?? null;
    } catch {
      // 404 or other — no score yet (model still training)
      return null;
    }
  }

  const [vibe] = createResource(shouldLoad, fetchVibe);

  // Resolve entity + team names from local meta DB for blurb templating.
  // Reading vibe() ties this memo to resource resolution — by then meta is loaded.
  const names = createMemo<{ name: string; team: string }>(() => {
    if (!vibe() || !sport || !id) return { name: '', team: '' };
    if (type === 'player') {
      const m = entityDataStore.getPlayerMetaSync(sport, id);
      return { name: m?.name || '', team: m?.team?.name || '' };
    }
    const m = entityDataStore.getTeamMetaSync(sport, id);
    return { name: m?.name || '', team: '' };
  });

  const tier = createMemo(() => {
    const v = vibe();
    return v && v.sentiment != null ? tierForScore(v.sentiment) : null;
  });

  // Lock in a single random blurb per (entity, score) pair so it doesn't
  // re-shuffle on unrelated reactive updates.
  const blurb = createMemo(() => {
    const t = tier();
    if (!t) return '';
    const { name, team } = names();
    return pickBlurb(t, name, team);
  });

  return (
    <Show when={shouldLoad()} fallback={<TrainingState />}>
      <Show when={!vibe.loading} fallback={
        <div class="tab-loading-skeleton">
          <div class="tab-skeleton-item tall" />
        </div>
      }>
        <Show when={vibe()} fallback={<TrainingState />}>
          {(row) => (
            <Show when={tier()} fallback={<NotEnoughNewsState />}>
              {(t) => (
                <article class={`vibe-card vibe-${t().className}`}>
                  <div class="vibe-emoji" role="img" aria-label={t().label}>
                    {t().emoji}
                  </div>
                  <div class="vibe-score" aria-label="Vibe score">
                    <span class="vibe-score-value">{row().sentiment}</span>
                    <span class="vibe-score-max">/100</span>
                  </div>
                  <p class="vibe-blurb">{blurb()}</p>
                  <footer class="vibe-meta">
                    <span class="vibe-meta-date">{formatDate(row().generated_at)}</span>
                    <span class="vibe-meta-dot" aria-hidden="true">·</span>
                    <span class="vibe-meta-model">{row().model_version}</span>
                  </footer>
                </article>
              )}
            </Show>
          )}
        </Show>
      </Show>
    </Show>
  );
}

function TrainingState() {
  return (
    <div class="vibes-training-wrapper">
      <div class="vibes-training">
        <div class="robot-icon" aria-hidden="true">
          <RobotSvg />
        </div>
        <p class="vibes-training-title">Model is training</p>
        <p class="vibes-training-subtitle">
          We're still gathering data. Vibe scores will appear here soon.
        </p>
      </div>
    </div>
  );
}

function NotEnoughNewsState() {
  return (
    <div class="vibes-training-wrapper">
      <div class="vibes-training vibes-lonely">
        <div class="robot-icon robot-lonely" aria-hidden="true">
          <RobotSvg lonely />
        </div>
        <p class="vibes-training-title">Not enough news yet</p>
        <p class="vibes-training-subtitle">
          We couldn't find enough recent coverage to score the vibe. Check back after the next news cycle.
        </p>
      </div>
    </div>
  );
}

function RobotSvg(props: { lonely?: boolean } = {}) {
  // Eye y-coordinates shift down + a small frown line appears in lonely mode.
  const eyeY = props.lonely ? 30 : 28;
  return (
    <svg width="88" height="88" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="10" y1="68" x2="110" y2="68" />
      <rect x="6" y="56" width="8" height="24" rx="1.5" />
      <rect x="18" y="50" width="6" height="36" rx="1.5" />
      <rect x="106" y="56" width="8" height="24" rx="1.5" />
      <rect x="96" y="50" width="6" height="36" rx="1.5" />
      <rect x="42" y="14" width="36" height="30" rx="6" />
      <line x1="60" y1="14" x2="60" y2="6" />
      <circle cx="60" cy="5" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="52" cy={eyeY} r="2.5" fill="currentColor" stroke="none" />
      <circle cx="68" cy={eyeY} r="2.5" fill="currentColor" stroke="none" />
      <Show when={props.lonely} fallback={<line x1="52" y1="37" x2="68" y2="37" />}>
        {/* Frown */}
        <path d="M 52 39 Q 60 34 68 39" fill="none" />
      </Show>
      <line x1="55" y1="44" x2="55" y2="50" />
      <line x1="65" y1="44" x2="65" y2="50" />
      <rect x="46" y="50" width="28" height="24" rx="4" />
      <line x1="46" y1="58" x2="34" y2="68" />
      <line x1="74" y1="58" x2="86" y2="68" />
    </svg>
  );
}
