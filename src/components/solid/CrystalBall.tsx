/**
 * CrystalBall — sport carousel.
 *
 * Auto-cycling sport logo inside the crystal-ball image. The first visible
 * sport is picked on client mount so every home-page visit starts from a
 * random logo, then the component advances passively every 3s.
 *
 * The cycle animation is pure CSS: the sport layer dissolves out through the
 * fog (`.is-exiting`), the logo swaps at the midpoint, and the new sport
 * condenses in (`.is-entering`) — keyframes in CrystalBall.css. The fog vapor
 * flares over the swap, so the sequential out→in reads as one reveal.
 *
 * Sport selection used to live on this component (arrow buttons + the
 * SearchBar housed inline below). It was lifted to a sibling
 * <NavRail> when the home page adopted the profile-page brand
 * silhouette (Shell + Card stack).
 *
 * The carousel is visual-only: it does not publish to `$currentSport`.
 * Home search resolves sport from the selected universal-search result.
 */

import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { getSportDisplay } from '../../lib/types';
import './CrystalBall.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Sport {
  id: string;
  display: string;
}

interface CrystalBallProps {
  mainLogoPath: string;
  sportLogos: Record<string, string>;
  sports: Sport[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CYCLE_INTERVAL = 3000;
/** One half of the reveal: exit dissolve, then the same again entering. Keep
 *  in sync with the animation durations in CrystalBall.css. */
const SWAP_HALF_MS = 450;
const SWIPE_THRESHOLD = 50;

// ─── Component ──────────────────────────────────────────────────────────────

export default function CrystalBall(props: CrystalBallProps) {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [mounted, setMounted] = createSignal(false);
  const [phase, setPhase] = createSignal<'in' | 'out'>('in');

  let cycleTimer: number | undefined;
  let swapTimer: number | undefined;
  let touchStartX = 0;
  let touchStartY = 0;

  // ── Derived state ──────────────────────────────────────────────────────

  function currentSportId(): string {
    return props.sports[currentIndex()]?.id ?? props.sports[0].id;
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
    // Dissolve out, swap the sport at the fog-covered midpoint, condense in.
    // A second advance mid-swap just re-targets the pending swap.
    window.clearTimeout(swapTimer);
    setPhase('out');
    swapTimer = window.setTimeout(() => {
      setCurrentIndex((idx) => (idx + dir + props.sports.length) % props.sports.length);
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
    // The sport layer intentionally renders only after mount. SSR and the
    // first client render both omit it, then this random index enters through
    // the same fog reveal as every later cycle.
    const randomStart = Math.floor(Math.random() * props.sports.length);
    setCurrentIndex(randomStart);
    setMounted(true);
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
          <div class="sport-display">
            <Show when={mounted()}>
              <div
                class="sport-option"
                classList={{
                  'is-entering': phase() === 'in',
                  'is-exiting': phase() === 'out',
                }}
              >
                <div class="sport-fog-vapor" aria-hidden="true" />
                <img
                  src={props.sportLogos[currentSportId()]}
                  alt={getSportDisplay(currentSportId())}
                  class="sport-logo"
                />
              </div>
            </Show>
          </div>
        </div>
      </div>

    </div>
  );
}
