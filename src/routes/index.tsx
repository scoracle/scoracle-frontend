import { createSignal, onMount, onCleanup } from "solid-js";
import { useStore } from "@nanostores/solid";
import { SPORTS } from "../lib/types";
import { entityDataStore } from "../lib/utils/entity-data-store";
import { $currentSport, setSport } from "../stores/sport";
import CrystalBall from "../components/solid/CrystalBall";
import Shell from "../components/solid/Shell";
import NavTabs from "../components/solid/NavTabs";
import SearchBar from "../components/solid/SearchBar";
import GutterAds from "../components/solid/GutterAds";
import "./index.css";

const SPORT_NAV_ITEMS = SPORTS.map((s) => ({ id: s.idLower, label: s.display }));

const SPORT_LOGOS: Record<string, string> = {
  nba: "/images/nba-logo.png",
  nfl: "/images/nfl-logo.png",
  football: "/images/fifa-logo.png",
};

const sports = SPORTS.map((s) => ({ id: s.idLower, display: s.display }));

const INACTIVITY_RESUME_MS = 30_000;

export default function Home() {
  const sport = useStore($currentSport);

  // Page-level "are we paused?" gate for the CrystalBall auto-cycle.
  // Both the sport NavTabs and the SearchBar pause via pauseCycle;
  // the cycle resumes after INACTIVITY_RESUME_MS of quiet. Owned here
  // (not in CrystalBall) because multiple siblings drive the pause —
  // keeping the timer in one place avoids duplicate resume races.
  const [cyclePaused, setCyclePaused] = createSignal(false);
  let resumeTimer: number | undefined;

  function pauseCycle() {
    setCyclePaused(true);
    if (resumeTimer !== undefined) clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => setCyclePaused(false), INACTIVITY_RESUME_MS);
  }

  function handleSportSelect(id: string) {
    setSport(id);
    pauseCycle();
  }

  onCleanup(() => {
    if (resumeTimer !== undefined) clearTimeout(resumeTimer);
  });

  onMount(() => {
    // Preload all sport entity JSON during idle time. Skip on
    // constrained networks (Save-Data, slow-2g/2g effective type).
    type NetworkInformationLike = {
      saveData?: boolean;
      effectiveType?: string;
    };
    const connection = (
      navigator as Navigator & { connection?: NetworkInformationLike }
    ).connection;
    const isConstrainedNetwork =
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g";
    if (isConstrainedNetwork) return;

    const preloadAllSports = () => {
      void entityDataStore.preloadAll();
    };
    const requestIdleCallbackFn = (
      window as Window & {
        requestIdleCallback?: (
          callback: IdleRequestCallback,
          options?: IdleRequestOptions,
        ) => number;
      }
    ).requestIdleCallback;

    if (typeof requestIdleCallbackFn === "function") {
      requestIdleCallbackFn(() => preloadAllSports(), { timeout: 2000 });
    } else {
      setTimeout(preloadAllSports, 0);
    }
  });

  return (
    <main class="home-main">
      <header class="home-headline">
        <h1 class="home-headline-title">SCORACLE</h1>
      </header>
      <div class="central-card">
        <CrystalBall
          mainLogoPath="/images/scoracle_crystal_ball.png"
          sportLogos={SPORT_LOGOS}
          sports={sports}
          paused={cyclePaused()}
          onInteraction={pauseCycle}
        />
      </div>
      {/* One Shell wrapping tab row + search input — neatly spaced
          with internal padding. Reads as a single brand-silhouette
          card rather than two stacked cards floating below the ball. */}
      <Shell class="home-search-shell" aria-label="Search Scoracle">
        <NavTabs
          items={SPORT_NAV_ITEMS}
          active={sport()}
          onSelect={handleSportSelect}
          variant="feature"
          ariaLabel="Select sport"
        />
        <div class="home-search-shell-search">
          <SearchBar onInteraction={pauseCycle} autoFocus />
        </div>
      </Shell>
      <GutterAds />
    </main>
  );
}
