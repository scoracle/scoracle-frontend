import { createSignal, onMount, onCleanup } from "solid-js";
import { SPORTS } from "../lib/types";
import { entityDataStore } from "../lib/utils/entity-data-store";
import CrystalBall from "../components/solid/CrystalBall";
import SearchBar from "../components/solid/SearchBar";
import GutterAds from "../components/solid/GutterAds";
import "./index.css";

const SPORT_LOGOS: Record<string, string> = {
  nba: "/images/nba-logo.png",
  nfl: "/images/nfl-logo.png",
  football: "/images/fifa-logo.png",
};

const sports = SPORTS.map((s) => ({ id: s.idLower, display: s.display }));

const INACTIVITY_RESUME_MS = 30_000;

export default function Home() {
  // Page-level "are we paused?" gate for the CrystalBall auto-cycle.
  // SearchBar and crystal swipe interactions pause via pauseCycle; the cycle
  // resumes after INACTIVITY_RESUME_MS of quiet.
  const [cyclePaused, setCyclePaused] = createSignal(false);
  let resumeTimer: number | undefined;

  function pauseCycle() {
    setCyclePaused(true);
    if (resumeTimer !== undefined) clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => setCyclePaused(false), INACTIVITY_RESUME_MS);
  }

  onCleanup(() => {
    if (resumeTimer !== undefined) clearTimeout(resumeTimer);
  });

  onMount(() => {
    // Preload the universal home search index during idle time. Skip on
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

    const preloadUniversalSearch = () => {
      void entityDataStore.getUniversalEntities();
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
      requestIdleCallbackFn(() => preloadUniversalSearch(), { timeout: 2000 });
    } else {
      setTimeout(preloadUniversalSearch, 0);
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
      <div class="home-search">
        <SearchBar scope="global" onInteraction={pauseCycle} autoFocus />
      </div>
      <GutterAds />
    </main>
  );
}
