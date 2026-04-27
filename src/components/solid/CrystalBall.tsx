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
 * Sport logos are passed in as props (paths under /public/images/).
 * Image optimization is currently raw-PNG; pre-launch follow-up is
 * tracked in docs/progress/2026-04-25_home-page-port.md.
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
  // SSR renders index 0 (deterministic — first sport in the list); the
  // randomized starting index is applied on client mount so the markup
  // matches between server and client. Without this gate, the SSR HTML
  // randomized differently than the client and forced the parent to
  // wrap CrystalBall in clientOnly(), which produced a visible
  // empty-then-pop on every home-page load.
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [direction, setDirection] = createSignal(1);

  let cycleTimer: number | undefined;
  let resumeTimer: number | undefined;
  let paused = false;
  let touchStartX = 0;
  let touchStartY = 0;
  // True until the on-mount random-jump completes. The Transition's enter/exit
  // callbacks short-circuit while this is set so the initial SSR→random index
  // change snaps instead of animating.
  let suppressTransition = true;

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
    if (suppressTransition) return;
    (el as HTMLElement).style.opacity = '0';
  }

  function onEnter(el: Element, done: () => void) {
    if (suppressTransition) { done(); return; }
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
    if (suppressTransition) { done(); return; }
    el.animate(
      [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: `translateX(${direction() > 0 ? '-20px' : '20px'})` },
      ],
      { duration: TRANSITION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    ).finished.then(done);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  onMount(() => {
    // Randomize the starting sport on the client. SSR rendered index 0;
    // jump silently (suppressTransition is true here) so the user doesn't
    // see an NBA→random fade. Release the suppression on next microtask
    // so subsequent cycles animate normally.
    const randomStart = Math.floor(Math.random() * props.sports.length);
    setCurrentIndex(randomStart);
    setSport(props.sports[randomStart].id);
    queueMicrotask(() => { suppressTransition = false; });
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
