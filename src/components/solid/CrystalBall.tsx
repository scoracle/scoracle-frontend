/**
 * CrystalBall — sport carousel (Solid.js island).
 *
 * Auto-cycling sport logo inside the crystal-ball image. Starts from a
 * random sport on hydration, advances every 3s. The home page owns the
 * "should I be cycling right now?" state (`paused` prop) — it pauses
 * when the sport <NavStrip> row or the SearchBar fires the home page's
 * `pauseCycle`, plus CrystalBall calls onInteraction itself for its
 * own swipe gestures. Resume after the inactivity window is handled
 * at the page level.
 *
 * Sport selection used to live on this component (arrow buttons + the
 * SearchBar housed inline below). It was lifted to a sibling
 * <NavStrip feature> when the home page adopted the profile-page brand
 * silhouette (Shell + Card stack).
 *
 * External sport changes (tabs, persisted store) snap the carousel by
 * subscribing to $currentSport. Internal cycle advances also publish
 * via setSport so the rest of the platform stays in sync.
 */

import { createSignal, createEffect, on, onMount, onCleanup, Show } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { useStore } from '@nanostores/solid';
import { $currentSport, setSport } from '../../stores/sport';
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
  /** Page-level pause flag. When true, the auto-cycle stops. */
  paused: boolean;
  /** Called for user-initiated interactions on the crystal ball itself
   *  (swipe gestures). The parent's pause/resume timer should start. */
  onInteraction?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CYCLE_INTERVAL = 3000;
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
  const storeSport = useStore($currentSport);

  let cycleTimer: number | undefined;
  let touchStartX = 0;
  let touchStartY = 0;
  // True until the on-mount random-jump completes. The Transition's
  // enter/exit callbacks short-circuit while this is set so the
  // initial SSR→random index change snaps instead of animating.
  let suppressTransition = true;

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
    setDirection(dir);
    const newIdx = (currentIndex() + dir + props.sports.length) % props.sports.length;
    setCurrentIndex(newIdx);
    setSport(props.sports[newIdx].id);
  }

  // ── External sport sync (tabs, persisted store) ─────────────────────────
  //
  // When sport NavStrip flips the store, snap the carousel to that
  // sport. The parent owns the pause/resume timer, so we don't pause
  // here — the tab click already called onInteraction on the parent.

  function syncFromStore(sportId: string) {
    const idx = props.sports.findIndex(s => s.id === sportId);
    if (idx < 0 || idx === currentIndex()) return;
    setDirection(idx > currentIndex() ? 1 : -1);
    setCurrentIndex(idx);
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
      props.onInteraction?.();
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
    if (!props.paused) startCycle();
  });

  // Subscribe to external sport changes (tab clicks in sport NavStrip,
  // persisted-store reads). Deferred so the initial subscription
  // doesn't re-trigger on mount.
  createEffect(on(storeSport, (s) => { syncFromStore(s); }, { defer: true }));

  // React to the parent's pause flag. When paused flips false (i.e.,
  // the inactivity window elapsed), the cycle restarts from wherever
  // the carousel currently is.
  createEffect(() => {
    if (props.paused) stopCycle();
    else startCycle();
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

    </div>
  );
}
