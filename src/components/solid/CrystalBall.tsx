/**
 * CrystalBall — movers carousel.
 *
 * Auto-cycling slide inside the crystal-ball image: the biggest vibe/rating
 * risers and fallers off the momentum boards — team crest, name, and the
 * signed delta with a direction triangle (green up, red down, per the tier
 * palette). The first mover is SSR'd (index 0, deterministic, so hydration
 * matches byte-for-byte); the cycle starts on mount and advances every 3s.
 * With no movers (backend empty/offline) the ball simply holds its fog.
 *
 * The cycle animation is pure CSS: the slide dissolves out through the fog
 * (`.is-exiting`), the content swaps at the midpoint, and the new slide
 * condenses in (`.is-entering`) — keyframes in CrystalBall.css. The fog vapor
 * flares over the swap, so the sequential out→in reads as one reveal.
 *
 * Each slide links to the mover's profile (the cycle pauses on hover/focus so
 * the target holds still). The carousel does not publish to `$currentSport`;
 * home search resolves sport from the selected universal-search result.
 */

import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import type { HomeMover } from '../../lib/data/leaderboard.server';
import { profilePath } from '../../lib/utils/profile-url';
import './CrystalBall.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CrystalBallProps {
  mainLogoPath: string;
  /** Momentum movers to cycle. Sport-paired order from getHomeMovers. */
  movers: HomeMover[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CYCLE_INTERVAL = 3000;
/** One half of the reveal: exit dissolve, then the same again entering. Keep
 *  in sync with the animation durations in CrystalBall.css. */
const SWAP_HALF_MS = 450;
const SWIPE_THRESHOLD = 50;

function profileHref(mover: HomeMover): string {
  return profilePath(mover.sport, mover.entity_type, mover.id, { name: mover.name });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CrystalBall(props: CrystalBallProps) {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [phase, setPhase] = createSignal<'in' | 'out'>('in');

  let cycleTimer: number | undefined;
  let swapTimer: number | undefined;
  let touchStartX = 0;
  let touchStartY = 0;

  // ── Derived state ──────────────────────────────────────────────────────

  function mover(): HomeMover | null {
    const movers = props.movers;
    return movers.length > 0 ? movers[currentIndex() % movers.length] : null;
  }

  // ── Auto-cycle ──────────────────────────────────────────────────────────

  function startCycle() {
    if (cycleTimer !== undefined) return;
    cycleTimer = window.setInterval(() => advance(1), CYCLE_INTERVAL);
  }

  function stopCycle() {
    if (cycleTimer !== undefined) {
      clearInterval(cycleTimer);
      cycleTimer = undefined;
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  function advance(dir: number) {
    // Dissolve out, swap the mover at the fog-covered midpoint, condense in.
    // A second advance mid-swap just re-targets the pending swap. A single
    // (or empty) deck has nowhere to go — hold the slide instead of blinking.
    const count = props.movers.length;
    if (count < 2) return;
    window.clearTimeout(swapTimer);
    setPhase('out');
    swapTimer = window.setTimeout(() => {
      setCurrentIndex((idx) => (idx + dir + count) % count);
      setPhase('in');
    }, SWAP_HALF_MS);
  }

  // ── Touch / Swipe ─────────────────────────────────────────────────────

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      advance(dx < 0 ? 1 : -1);
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  onMount(() => {
    startCycle();
  });

  onCleanup(() => {
    // onCleanup ALSO runs during SSR disposal, where `window` does not exist —
    // both branches must stay behind the never-set-on-server timer guards.
    stopCycle();
    if (swapTimer !== undefined) {
      clearTimeout(swapTimer);
      swapTimer = undefined;
    }
  });

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      class="crystal-ball-container"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div class="logo-wrapper">
        <img
          src={props.mainLogoPath}
          alt="Scoracle"
          class="crystal-logo"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />

        <div class="crystal-selector">
          <div class="slide-stage">
            <Show when={mover()}>
              {(m) => (
                <div
                  class="slide"
                  classList={{
                    'is-entering': phase() === 'in',
                    'is-exiting': phase() === 'out',
                  }}
                >
                  <div class="slide-fog-vapor" aria-hidden="true" />
                  {/* Pause the cycle while the pointer (or focus) is on the
                      link so the target can't dissolve out from under a click. */}
                  <a
                    class="mover-card"
                    href={profileHref(m())}
                    onMouseEnter={stopCycle}
                    onMouseLeave={startCycle}
                    onFocusIn={stopCycle}
                    onFocusOut={startCycle}
                  >
                    <Show when={m().team_logo ?? m().image}>
                      {(crest) => <img src={crest()} alt="" class="mover-crest" />}
                    </Show>
                    <span class="mover-name">{m().name}</span>
                    <span
                      class="mover-delta"
                      classList={{ 'is-up': m().delta > 0, 'is-down': m().delta < 0 }}
                    >
                      <svg class="mover-arrow" viewBox="0 0 10 10" aria-hidden="true">
                        <path d={m().delta > 0 ? 'M5 1.5 9 8.5H1z' : 'M5 8.5 1 1.5h8z'} />
                      </svg>
                      {Math.abs(m().delta).toFixed(1)}
                      <span class="mover-metric">{m().metric === 'vibe' ? 'Vibe' : 'Rating'}</span>
                    </span>
                  </a>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>

    </div>
  );
}
