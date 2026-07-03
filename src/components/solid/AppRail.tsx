import { useLocation, useNavigate } from "@solidjs/router";
import { useStore } from "@nanostores/solid";
import { createEffect, createSignal, For, onMount, Show, type JSX } from "solid-js";

import { $currentSport } from "../../stores/sport";
import { transferNoun } from "../../lib/cards/card-meta";
import { entityDataStore } from "../../lib/utils/entity-data-store";
import SearchBar from "./SearchBar";
import "./AppRail.css";

type RailBoard = "composite" | "news" | "vibes" | "trending" | "transfers";

interface RecentEntity {
  sport: string;
  type: "player" | "team";
  id: string;
  name: string;
}

interface RailItem {
  id: RailBoard;
  label: string;
  icon: JSX.Element;
}

const RECENTS_KEY = "scoracle.recentEntities";
const MAX_RECENTS = 5;

function boardHref(sport: string, board: RailBoard): string {
  const params = new URLSearchParams({ sport: sport.toUpperCase() });
  if (board !== "composite") params.set("board", board);
  return `/leaderboard?${params.toString()}`;
}

function profileHref(entity: RecentEntity): string {
  return `/profile?sport=${entity.sport.toUpperCase()}&type=${entity.type}&id=${entity.id}`;
}

function readRecents(): RecentEntity[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]") as RecentEntity[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function writeRecents(items: RecentEntity[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
}

/* Brand mark — simplified linework crystal ball (ball, sparkle, pedestal).
   Inline SVG on currentColor so it speaks the same stroke language as the
   rail icons and stays crisp at rail size; the detailed illustration
   (`scoracle_crystal_ball.png`) remains the home-page hero. Mirrors the
   favicon art. */
function BrandMark() {
  return (
    <svg class="app-rail-logo" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="10.4" r="6.9" />
      <path
        class="app-rail-logo-sparkle"
        d="M9.2 6.3 Q9.66 8.04 11.4 8.5 Q9.66 8.96 9.2 10.7 Q8.74 8.96 7 8.5 Q8.74 8.04 9.2 6.3 Z"
      />
      <path d="M7.8 15.9 C8.35 17.6 9.9 18.6 12 18.6 C14.1 18.6 15.65 17.6 16.2 15.9" />
      <path d="M6.9 19.8 H17.1" />
    </svg>
  );
}

function RatingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 18.5h11" />
      <path d="M8.5 15.5l2-7 2.5 5 2-8 1.5 10" />
      <path d="M7.25 12.25h2.25" />
      <path d="M14.75 12.25h2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M14.5 14.5l4.5 4.5" />
      <path d="M8.5 10.5h4" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5.5h9.5l1.5 2V18.5H7z" />
      <path d="M16.5 5.5V8H18" />
      <path d="M9.25 10.5h5.5" />
      <path d="M9.25 13.5h6.5" />
      <path d="M9.25 16.5h4" />
    </svg>
  );
}

function VibeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.5 20c3.25-1.2 5.1-3.55 5.1-6.45 0-2.65-1.5-4.35-3.35-5.95.05 1.75-.55 3.1-1.7 4.05.2-2.8-1.05-5.15-3.15-7.15.1 3.4-2.95 5.2-2.95 8.85 0 3.1 2.05 5.55 5.05 6.65" />
      <path d="M12 19.8c1.25-.75 2-1.85 2-3.2 0-1.25-.65-2.15-1.55-2.95-.1 1.1-.55 1.95-1.35 2.55.05-1.45-.55-2.7-1.5-3.8-.15 1.55-1.55 2.7-1.55 4.35 0 1.25.75 2.35 1.95 3.05" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 17.5l4.25-4.25 3 2.75 5.75-7.5" />
      <path d="M14.75 8.5h3.75v3.75" />
      <path d="M6.5 7.5h3" />
      <path d="M6.5 10h1.75" />
    </svg>
  );
}

function TransfersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.25h10.25" />
      <path d="M14.25 5.75l2.5 2.5-2.5 2.5" />
      <path d="M17.5 15.75H7.25" />
      <path d="M9.75 13.25l-2.5 2.5 2.5 2.5" />
      <path d="M11.25 11.4l1.5 1.2" />
    </svg>
  );
}

export default function AppRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const sport = useStore($currentSport);
  const [recents, setRecents] = createSignal<RecentEntity[]>([]);
  const [searchOpen, setSearchOpen] = createSignal(false);

  const items = (): RailItem[] => [
    { id: "composite", label: "Rankings", icon: <RatingIcon /> },
    { id: "news", label: "News", icon: <NewsIcon /> },
    { id: "vibes", label: "Vibes", icon: <VibeIcon /> },
    { id: "trending", label: "Risers", icon: <TrendingIcon /> },
    { id: "transfers", label: transferNoun(sport() ?? "nba"), icon: <TransfersIcon /> },
  ];
  const isHome = () => location.pathname === "/";

  function go(board: RailBoard) {
    navigate(boardHref(sport() ?? "nba", board));
  }

  function goRecent(entity: RecentEntity) {
    navigate(profileHref(entity));
  }

  function goHome() {
    navigate("/");
  }

  function toggleSearch() {
    setSearchOpen((open) => !open);
  }

  async function rememberCurrentProfile() {
    if (location.pathname !== "/profile") return;

    const params = new URLSearchParams(location.search);
    const rawSport = params.get("sport")?.toLowerCase();
    const rawType = params.get("type");
    const id = params.get("id");
    if (!rawSport || !id || (rawType !== "player" && rawType !== "team")) return;

    const entities = await entityDataStore.getEntities(rawSport).catch(() => []);
    const match = entities.find((entity) => entity.id === id && entity.type === rawType);
    const next: RecentEntity = {
      sport: rawSport,
      type: rawType,
      id,
      name: match?.name ?? `${rawType} ${id}`,
    };

    setRecents((current) => {
      const deduped = current.filter(
        (item) => !(item.sport === next.sport && item.type === next.type && item.id === next.id),
      );
      const updated = [next, ...deduped].slice(0, MAX_RECENTS);
      writeRecents(updated);
      return updated;
    });
  }

  onMount(() => {
    setRecents(readRecents());
  });

  createEffect(() => {
    void rememberCurrentProfile();
  });

  createEffect(() => {
    if (isHome()) setSearchOpen(false);
  });

  return (
    <nav
      class="app-rail"
      classList={{ "app-rail-home-route": isHome() }}
      aria-label="Scoracle navigation"
    >
      <div class="app-rail-brand">
        <button
          type="button"
          class="app-rail-btn app-rail-home-btn"
          aria-label="Home"
          onClick={goHome}
        >
          <BrandMark />
          <span class="app-rail-title" aria-hidden="true">Scoracle</span>
          <span class="app-rail-tip" aria-hidden="true">Home</span>
        </button>
      </div>
      <div class="app-rail-primary" aria-label="Discovery boards">
        <Show when={!isHome()}>
          <button
            type="button"
            class="app-rail-btn"
            classList={{ "app-rail-btn-active": searchOpen() }}
            aria-label="Search"
            aria-expanded={searchOpen()}
            onClick={toggleSearch}
          >
            <span class="app-rail-icon"><SearchIcon /></span>
            <span class="app-rail-tip" aria-hidden="true">Search</span>
          </button>
        </Show>
        <For each={items()}>
          {(item) => (
            <button
              type="button"
              class="app-rail-btn"
              aria-label={item.label}
              onClick={() => go(item.id)}
            >
              <span class="app-rail-icon">{item.icon}</span>
              <span class="app-rail-tip" aria-hidden="true">{item.label}</span>
            </button>
          )}
        </For>
      </div>
      <Show when={!isHome() && searchOpen()}>
        <div class="app-rail-search" role="search" aria-label="Search entities">
          <SearchBar autoFocus />
        </div>
      </Show>
      <Show when={recents().length > 0}>
        <div class="app-rail-recents" aria-label="Recently viewed">
          <For each={recents()}>
            {(entity) => (
              <button
                type="button"
                class="app-rail-recent"
                aria-label={`Open ${entity.name}`}
                onClick={() => goRecent(entity)}
              >
                <span class="app-rail-recent-mark" aria-hidden="true">
                  {entity.name.slice(0, 1)}
                </span>
                <span class="app-rail-tip" aria-hidden="true">{entity.name}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </nav>
  );
}
