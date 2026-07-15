import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";

import { currentSport } from "../../stores/sport";
import { transferNoun } from "../../lib/cards/card-meta";
import { getSportMetaMaps, type SportMetaMaps } from "../../lib/data/entity-directory";
import { paramValue } from "../../lib/utils/search-params";
import type { AutocompleteEntity } from "../../lib/types";
import SearchBar from "./SearchBar";
import "./AppTray.css";

type TrayBoard = "rating" | "news" | "vibes" | "momentum" | "sigil" | "transfers";

interface RecentEntity {
  sport: string;
  type: "player" | "team";
  id: string;
  name: string;
  /** Headshot (players) or crest/logo (teams). Absent on legacy records or
   *  when the entity ships no image — the mark falls back to a monogram. */
  image?: string;
}

interface TrayItem {
  id: TrayBoard;
  label: string;
  icon: JSX.Element;
}

const RECENTS_KEY = "scoracle.recentEntities";
const EXPANDED_KEY = "scoracle.trayExpanded";
const MAX_RECENTS = 5;

// Legal destinations — the tray's parity with the iOS "Legal" row. Web keeps
// these as discrete routes (they already share legal.css and the Footer nav),
// so the expanded tray surfaces them as a small cluster.
const LEGAL_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/about", label: "About" },
];

function boardHref(sport: string, board: TrayBoard): string {
  const params = new URLSearchParams({ sport: sport.toUpperCase() });
  if (board !== "rating") params.set("board", board);
  return `/leaderboard?${params.toString()}`;
}

function profileHref(entity: RecentEntity): string {
  return `/profile?sport=${entity.sport.toUpperCase()}&type=${entity.type}&id=${entity.id}`;
}

function searchProfileHref(entity: AutocompleteEntity, fallbackSport: string): string {
  return `/profile?sport=${(entity.sport || fallbackSport).toUpperCase()}&type=${entity.type}&id=${entity.id}`;
}

/** Resolve a recent's display name + avatar off the sport's meta maps.
 *  Players prefer their headshot, then fall back to their team's crest; teams
 *  use their own logo. Mirrors EntityMeta's avatar resolution. */
function resolveRecentMeta(
  maps: SportMetaMaps,
  type: "player" | "team",
  id: string,
): { name: string; image: string } | null {
  if (type === "player") {
    const player = maps.players[id];
    if (!player) return null;
    const teamId = player.team?.id;
    const image =
      player.photo_url ||
      (teamId != null ? maps.teams[String(teamId)]?.logo_url ?? "" : "");
    return { name: player.name, image };
  }
  const team = maps.teams[id];
  if (!team) return null;
  return { name: team.name, image: team.logo_url ?? "" };
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
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
  } catch {
    // Storage can be unavailable in restricted iframe/privacy contexts.
  }
}

function readExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeExpanded(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPANDED_KEY, value ? "1" : "0");
  } catch {
    // Storage can be unavailable in restricted iframe/privacy contexts.
  }
}

/* Brand mark — the home-page hero crystal ball minus the hands, reduced to icon
   linework: the ball, two glass-highlight slivers, and the scalloped petal cup
   it sits in. Inline SVG on currentColor keeps the mark crisp at rail size; the
   detailed illustration (`scoracle_crystal_ball.png`) remains the home-page
   hero. Geometry is shared with `public/favicon.svg` (scaled 4/3 there). */
function BrandMark() {
  return (
    <svg class="app-tray-logo" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="10.5" r="6.7" />
      <path d="M14.5 6.17 A5 5 0 0 1 16.64 8.63" />
      <path d="M7.24 12.05 A5 5 0 0 0 9.65 14.91" />
      <path d="M8.3 16.1 C7.4 17 6.8 18 6.8 18.9 a1.6 1.35 0 0 0 3.2 0 a2 1.5 0 0 0 4 0 a1.6 1.35 0 0 0 3.2 0 C17.2 18 16.6 17 15.7 16.1" />
    </svg>
  );
}

/* Sidebar toggle — the collapse/expand affordance. The macOS "toggle sidebar"
   glyph the desktop-app menus use: a rounded frame with the left panel
   partitioned off by a vertical divider (~⅓ in). */
function ToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="3.2" />
      <path d="M9.25 5.4v13.2" />
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

function MomentumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 17.5l4.25-4.25 3 2.75 5.75-7.5" />
      <path d="M14.75 8.5h3.75v3.75" />
      <path d="M6.5 7.5h3" />
      <path d="M6.5 10h1.75" />
    </svg>
  );
}

function SigilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5l5.8 3.35v6.7L12 17.9l-5.8-3.35v-6.7z" />
      <path d="M12 7.25v7.5" />
      <path d="M8.75 9.1l6.5 3.8" />
      <path d="M15.25 9.1l-6.5 3.8" />
      <path d="M8.5 20h7" />
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

/* Recent-entity avatar — the entity's headshot/crest, with a monogram fallback
   when there's no image (legacy record) or the third-party URL 403/404s. */
function RecentMark(props: { entity: RecentEntity }) {
  const [failed, setFailed] = createSignal(false);
  return (
    <Show
      when={props.entity.image && !failed()}
      fallback={
        <span class="app-tray-recent-mark" aria-hidden="true">
          {props.entity.name.slice(0, 1)}
        </span>
      }
    >
      <img
        class="app-tray-recent-mark app-tray-recent-img"
        src={props.entity.image}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </Show>
  );
}

export default function AppTray() {
  const sport = currentSport;
  const [recents, setRecents] = createSignal<RecentEntity[]>([]);
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  // AppTray renders inside the Router root, so the router's reactive location
  // is available — it is the only owner of location state (SSR included).
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  let searchButtonRef!: HTMLButtonElement;
  let searchPopoverRef!: HTMLDivElement;

  const items = (): TrayItem[] => [
    { id: "rating", label: "Rating", icon: <RatingIcon /> },
    { id: "news", label: "News", icon: <NewsIcon /> },
    { id: "vibes", label: "Vibe", icon: <VibeIcon /> },
    { id: "momentum", label: "Momentum", icon: <MomentumIcon /> },
    { id: "sigil", label: "Sigil", icon: <SigilIcon /> },
    { id: "transfers", label: transferNoun(sport() ?? "nba"), icon: <TransfersIcon /> },
  ];
  const isHome = () => location.pathname === "/";
  const activeBoard = (): TrayBoard | null => {
    if (location.pathname !== "/leaderboard") return null;
    const board = paramValue(searchParams.board);
    if (board === "trending" || board === "momentum") return "momentum";
    return board === "news" || board === "vibes" || board === "sigil" || board === "transfers"
      ? board
      : "rating";
  };

  function closeSearch() {
    setSearchOpen(false);
  }

  function toggleSearch() {
    setSearchOpen((open) => !open);
  }

  function toggleExpanded() {
    setExpanded((open) => {
      const next = !open;
      writeExpanded(next);
      return next;
    });
    // Expanding subsumes the search popover — the expanded tray owns the width.
    setSearchOpen(false);
  }

  async function rememberCurrentProfile() {
    if (location.pathname !== "/profile") return;

    const rawSport = paramValue(searchParams.sport)?.toLowerCase();
    const rawType = paramValue(searchParams.type);
    const id = paramValue(searchParams.id);
    if (!rawSport || !id || (rawType !== "player" && rawType !== "team")) return;

    const maps = await getSportMetaMaps(rawSport).catch(() => null);
    const match = maps ? resolveRecentMeta(maps, rawType, id) : null;
    const next: RecentEntity = {
      sport: rawSport,
      type: rawType,
      id,
      name: match?.name ?? `${rawType} ${id}`,
      image: match?.image || undefined,
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
    setExpanded(readExpanded());
  });

  createEffect(() => {
    void rememberCurrentProfile();
  });

  createEffect(() => {
    if (isHome()) setSearchOpen(false);
  });

  createEffect(() => {
    if (!searchOpen()) return;

    const onDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node;
      if (searchButtonRef?.contains(target) || searchPopoverRef?.contains(target)) return;
      setSearchOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSearchOpen(false);
        searchButtonRef?.focus();
      }
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKeyDown);
    });
  });

  return (
    <nav
      class="app-tray"
      classList={{ "app-tray-expanded": expanded() }}
      aria-label="Scoracle navigation"
    >
      {/* Header row. Collapsed: the toggle alone, centered. Expanded: wordmark
          left, toggle + search right — the desktop-app tray header this tray
          references. The header search opens the same pop-out the collapsed
          rail uses; the expanded panel carries no inline search field. */}
      <div class="app-tray-top">
        <Show when={expanded()}>
          <a href="/" class="app-tray-wordmark" onClick={closeSearch}>Scoracle</a>
        </Show>
        <Show when={expanded()}>
          <button
            ref={searchButtonRef}
            type="button"
            class="app-tray-btn app-tray-top-search"
            classList={{ "app-tray-btn-active": searchOpen() }}
            aria-label="Search"
            aria-expanded={searchOpen()}
            onClick={toggleSearch}
          >
            <span class="app-tray-icon"><SearchIcon /></span>
          </button>
        </Show>
        <button
          type="button"
          class="app-tray-btn app-tray-toggle"
          aria-label={expanded() ? "Collapse menu" : "Expand menu"}
          aria-expanded={expanded()}
          onClick={toggleExpanded}
        >
          <span class="app-tray-icon"><ToggleIcon /></span>
          <span class="app-tray-tip" aria-hidden="true">{expanded() ? "Collapse" : "Expand"}</span>
        </button>
      </div>
      <div class="app-tray-brand">
        <a
          href="/"
          class="app-tray-btn app-tray-home-btn"
          aria-label="Home"
          onClick={closeSearch}
        >
          <BrandMark />
          <span class="app-tray-label" aria-hidden="true">Home</span>
          <span class="app-tray-tip" aria-hidden="true">Home</span>
        </a>
      </div>
      <div class="app-tray-primary" aria-label="Discovery boards">
        <Show when={!isHome() && !expanded()}>
          <button
            ref={searchButtonRef}
            type="button"
            class="app-tray-btn"
            classList={{
              "app-tray-btn-active": searchOpen(),
              "app-tray-btn-suppress-tip": searchOpen(),
            }}
            aria-label="Search"
            aria-expanded={searchOpen()}
            onClick={toggleSearch}
          >
            <span class="app-tray-icon"><SearchIcon /></span>
            <span class="app-tray-tip" aria-hidden="true">Search</span>
          </button>
        </Show>
        <For each={items()}>
          {(item) => (
            <a
              href={boardHref(sport() ?? "nba", item.id)}
              class="app-tray-btn"
              classList={{ "app-tray-btn-active": activeBoard() === item.id }}
              aria-label={item.label}
              aria-current={activeBoard() === item.id ? "page" : undefined}
              onClick={closeSearch}
            >
              <span class="app-tray-icon">{item.icon}</span>
              <span class="app-tray-label" aria-hidden="true">{item.label}</span>
              <span class="app-tray-tip" aria-hidden="true">{item.label}</span>
            </a>
          )}
        </For>
      </div>
      <Show when={searchOpen()}>
        <div ref={searchPopoverRef} class="app-tray-search search-popover" role="search" aria-label="Search entities">
          <SearchBar
            scope="global"
            variant="compact"
            placeholder="Search players or teams"
            autoFocus
            onPick={(entity) => {
              setSearchOpen(false);
              navigate(searchProfileHref(entity, sport() ?? "nba"));
            }}
          />
        </div>
      </Show>
      <Show when={recents().length > 0}>
        <div class="app-tray-recents" aria-label="Recently viewed">
          <Show when={expanded()}>
            <span class="app-tray-section" aria-hidden="true">Recent</span>
          </Show>
          <For each={recents()}>
            {(entity) => (
              <a
                href={profileHref(entity)}
                class="app-tray-recent"
                aria-label={`Open ${entity.name}`}
                onClick={closeSearch}
              >
                <RecentMark entity={entity} />
                <span class="app-tray-label" aria-hidden="true">{entity.name}</span>
                <span class="app-tray-tip" aria-hidden="true">{entity.name}</span>
              </a>
            )}
          </For>
        </div>
      </Show>
      <Show when={expanded()}>
        <div class="app-tray-legal" aria-label="Legal">
          <span class="app-tray-section" aria-hidden="true">Legal</span>
          <For each={LEGAL_LINKS}>
            {(link) => (
              <a href={link.href} class="app-tray-legal-link" onClick={closeSearch}>
                {link.label}
              </a>
            )}
          </For>
        </div>
      </Show>
    </nav>
  );
}
