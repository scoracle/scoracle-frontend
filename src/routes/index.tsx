import { onMount } from "solid-js";
import { SPORTS } from "../lib/types";
import { entityDataStore } from "../lib/utils/entity-data-store";
import CrystalBall from "../components/solid/CrystalBall";
import "./index.css";

const SPORT_LOGOS: Record<string, string> = {
  nba: "/images/nba-logo.png",
  nfl: "/images/nfl-logo.png",
  football: "/images/fifa-logo.png",
};

const sports = SPORTS.map((s) => ({ id: s.idLower, display: s.display }));

export default function Home() {
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
        />
      </div>
    </main>
  );
}
