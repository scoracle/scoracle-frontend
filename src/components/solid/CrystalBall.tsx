/**
 * CrystalBall — sport carousel.
 *
 * Auto-cycling sport logo inside the crystal-ball image. The first visible
 * sport is picked on client mount so every home-page visit starts from a
 * random logo, then the component advances passively every 3s.
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
import { Transition } from 'solid-transition-group';
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
const TRANSITION_MS = 900;
const SWIPE_THRESHOLD = 50;

// ─── Component ──────────────────────────────────────────────────────────────

export default function CrystalBall(props: CrystalBallProps) {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [mounted, setMounted] = createSignal(false);

  let cycleTimer: number | undefined;
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
    const newIdx = (currentIndex() + dir + props.sports.length) % props.sports.length;
    setCurrentIndex(newIdx);
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

  // ── Transition callbacks (Web Animations API) ─────────────────────────

  function onBeforeEnter(el: Element) {
    const htmlEl = el as HTMLElement;
    htmlEl.style.opacity = '0';
    htmlEl.style.filter = 'blur(18px) saturate(0.82)';
    htmlEl.style.transform = 'translateY(5px) scale(0.82)';
  }

  function onEnter(el: Element, done: () => void) {
    const htmlEl = el as HTMLElement;
    const fogEl = htmlEl.querySelector<HTMLElement>('.sport-fog-vapor');
    const logoAnimation = htmlEl.animate(
      [
        { opacity: 0, filter: 'blur(18px) saturate(0.82)', transform: 'translateY(5px) scale(0.82)' },
        { opacity: 0.62, filter: 'blur(7px) saturate(0.92)', transform: 'translateY(1px) scale(1.04)', offset: 0.58 },
        { opacity: 1, filter: 'blur(0) saturate(1)', transform: 'translateY(0) scale(1)' },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    );
    fogEl?.animate(
      [
        { opacity: 0.95, transform: 'translate(-50%, -50%) scale(0.72) rotate(-5deg)' },
        { opacity: 0.62, transform: 'translate(-50%, -50%) scale(1.08) rotate(3deg)', offset: 0.48 },
        { opacity: 0.18, transform: 'translate(-50%, -50%) scale(1.28) rotate(8deg)' },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    );
    logoAnimation.finished.then(() => {
      htmlEl.style.opacity = '';
      htmlEl.style.filter = '';
      htmlEl.style.transform = '';
      done();
    });
  }

  function onExit(el: Element, done: () => void) {
    const htmlEl = el as HTMLElement;
    const fogEl = htmlEl.querySelector<HTMLElement>('.sport-fog-vapor');
    const logoAnimation = htmlEl.animate(
      [
        { opacity: 1, filter: 'blur(0) saturate(1)', transform: 'translateY(0) scale(1)' },
        { opacity: 0.32, filter: 'blur(8px) saturate(0.9)', transform: 'translateY(-1px) scale(1.03)', offset: 0.62 },
        { opacity: 0, filter: 'blur(16px) saturate(0.78)', transform: 'translateY(-4px) scale(0.9)' },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    );
    fogEl?.animate(
      [
        { opacity: 0.12, transform: 'translate(-50%, -50%) scale(1.08) rotate(0deg)' },
        { opacity: 0.78, transform: 'translate(-50%, -50%) scale(0.92) rotate(-4deg)' },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    );
    logoAnimation.finished.then(done);
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
    stopCycle();
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
            <Transition onBeforeEnter={onBeforeEnter} onEnter={onEnter} onExit={onExit}>
              <Show when={mounted() ? currentSportId() : null} keyed>
                {(sportId) => (
                  <div class="sport-option">
                    <div class="sport-fog-vapor" aria-hidden="true" />
                    <img
                      src={props.sportLogos[sportId]}
                      alt={getSportDisplay(sportId)}
                      class="sport-logo"
                    />
                  </div>
                )}
              </Show>
            </Transition>
          </div>
        </div>
      </div>

    </div>
  );
}
