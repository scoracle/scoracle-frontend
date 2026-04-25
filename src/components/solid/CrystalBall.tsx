/**
 * CrystalBall — Sport carousel + search (Solid.js island)
 *
 * Carousel with auto-cycling sport logos inside the crystal ball image.
 * Logo cycles every 3 seconds starting from a random sport. User
 * interaction (arrows, search bar, swipe) pauses the cycle; it resumes
 * after 30 seconds of inactivity.
 *
 * Search placeholder synonym cycling is owned by SearchBar.
 *
 * Astro handles build-time image optimization (getImage). This component
 * receives the optimized paths as props.
 */

import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { setSport } from '../../stores/sport';
import { getSportDisplay } from '../../lib/types';
import SearchBar from './SearchBar';
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
const INACTIVITY_RESUME = 30_000;
const TRANSITION_MS = 300;
const SWIPE_THRESHOLD = 50;

// ─── Component ──────────────────────────────────────────────────────────────

export default function CrystalBall(props: CrystalBallProps) {
  // Runtime random start — different every page load (client:only guarantees client execution)
  const randomStart = Math.floor(Math.random() * props.sports.length);

  const [currentIndex, setCurrentIndex] = createSignal(randomStart);
  const [direction, setDirection] = createSignal(1);

  let cycleTimer: number | undefined;
  let resumeTimer: number | undefined;
  let paused = false;
  let touchStartX = 0;
  let touchStartY = 0;

  // ── Derived state ──────────────────────────────────────────────────────

  function currentSportId(): string {
    return props.sports[currentIndex()]?.id ?? props.sports[0].id;
  }

  // ── Auto-cycle ──────────────────────────────────────────────────────────

  function startCycle() {
    cycleTimer = window.setInterval(() => advance(1), CYCLE_INTERVAL);
    paused = false;
  }

  function pauseCycle() {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = undefined; }
    paused = true;

    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      if (paused) startCycle();
    }, INACTIVITY_RESUME);
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  function advance(dir: number) {
    setDirection(dir);
    const newIdx = (currentIndex() + dir + props.sports.length) % props.sports.length;
    setCurrentIndex(newIdx);
    setSport(props.sports[newIdx].id);
  }

  function navigate(dir: number) {
    advance(dir);
    pauseCycle();
  }

  // ── Touch / Swipe ─────────────────────────────────────────────────��────

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      navigate(dx < 0 ? 1 : -1);
    }
  }

  // ── Transition callbacks (Web Animations API) ─────────────────────────

  function onBeforeEnter(el: Element) {
    (el as HTMLElement).style.opacity = '0';
  }

  function onEnter(el: Element, done: () => void) {
    const htmlEl = el as HTMLElement;
    const dir = direction();
    htmlEl.animate(
      [
        { opacity: 0, transform: `translateX(${dir > 0 ? '20px' : '-20px'})` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    ).finished.then(() => {
      htmlEl.style.opacity = '';
      done();
    });
  }

  function onExit(el: Element, done: () => void) {
    el.animate(
      [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: `translateX(${direction() > 0 ? '-20px' : '20px'})` },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    ).finished.then(done);
  }

  // ── Lifecycle ────────────────────────────────────────────────────��──────

  onMount(() => {
    setSport(props.sports[currentIndex()].id);
    startCycle();
  });

  onCleanup(() => {
    if (cycleTimer) clearInterval(cycleTimer);
    if (resumeTimer) clearTimeout(resumeTimer);
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
              <Show when={currentSportId()} keyed>
                {(sportId) => (
                  <div class="sport-option">
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

      <div class="search-with-nav">
        <button class="nav-arrow nav-arrow-left" aria-label="Previous sport" onClick={() => navigate(-1)}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <SearchBar onInteraction={pauseCycle} autoFocus />

        <button class="nav-arrow nav-arrow-right" aria-label="Next sport" onClick={() => navigate(1)}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
