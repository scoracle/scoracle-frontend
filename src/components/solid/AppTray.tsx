import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";

import { currentSport } from "../../stores/sport";
import { THEME_OPTIONS, initTheme, setTheme, themePref, type ThemePref } from "../../stores/theme";
import { transferNoun } from "../../lib/cards/card-meta";
import { getSportMetaMaps, type SportMetaMaps } from "../../lib/data/entity-directory";
import { paramValue } from "../../lib/utils/search-params";
import { profilePath, parseProfilePath } from "../../lib/utils/profile-url";
import type { AutocompleteEntity } from "../../lib/types";
import SearchBar from "./SearchBar";
import "./AppTray.css";

type TrayBoard = "rating" | "news" | "vibes" | "momentum" | "sigil" | "transfers";

interface TrayItem {
  id: TrayBoard;
  label: string;
  icon: JSX.Element;
}

/** Recently-viewed entity — restored 2026-08-08 (Scott: product wins over the
 *  spec's cut). The marks live in the glyph box and rest grayscale so the
 *  section stays quiet chrome, not five bright objects competing with the
 *  pile — see AppTray.css. */
interface RecentEntity {
  sport: string;
  type: "player" | "team";
  id: string;
  name: string;
  /** Headshot (players) or crest/logo (teams). Absent on legacy records or
   *  when the entity ships no image — the mark falls back to a monogram. */
  image?: string;
}

const EXPANDED_KEY = "scoracle.trayExpanded";
const RECENTS_KEY = "scoracle.recentEntities";
const MAX_RECENTS = 5;

// Legal destinations — the tray's parity with the iOS "Legal" row. Web keeps
// these as discrete routes (they already share legal.css and the Footer nav);
// the open tray surfaces them as one quiet line above the Appearance row.
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

function searchProfileHref(entity: AutocompleteEntity, fallbackSport: string): string {
  return profilePath(entity.sport || fallbackSport, entity.type, entity.id, {
    name: entity.name,
  });
}

function profileHref(entity: RecentEntity): string {
  return profilePath(entity.sport, entity.type, entity.id, { name: entity.name });
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

/* ─── The glyph set (Tray/Well/Board session, 2026-08-08) ─────────────────
   Ten glyphs, one construction: a 24 box with a 4px margin, 1.1px stroke,
   butt caps and mitre joins (AppTray.css owns the stroke). Each glyph is one
   continuous idea, drawn with as few strokes as it can survive. The brand
   mark is the one exception — round joins, see BrandMark below. */

/* Brand mark — the home-page hero crystal ball minus the hands, reduced to icon
   linework: the ball, two glass-highlight slivers, and the scalloped petal cup
   it sits in. Keeps round joins as a deliberate exception: it is a reduction of
   the hero illustration, not a UI glyph, and the favicon and card backs descend
   from it — that geometry belongs to the crystal-ball session. Geometry is
   shared with `public/favicon.svg` (scaled 4/3 there). Exported as the drawn
   source for the card backs (ContentShell). */
export function BrandMark(props: { class?: string }) {
  return (
    <svg class={props.class ?? "app-tray-logo"} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="10.5" r="6.7" />
      <path d="M14.5 6.17 A5 5 0 0 1 16.64 8.63" />
      <path d="M7.24 12.05 A5 5 0 0 0 9.65 14.91" />
      <path d="M8.3 16.1 C7.4 17 6.8 18 6.8 18.9 a1.6 1.35 0 0 0 3.2 0 a2 1.5 0 0 0 4 0 a1.6 1.35 0 0 0 3.2 0 C17.2 18 16.6 17 15.7 16.1" />
    </svg>
  );
}

/* Rail toggle — square frame, partition at ⅓. */
function RailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="13" />
      <path d="M9.5 5.5V18.5" />
    </svg>
  );
}

/* Search — the handle leaves the lens on the true diagonal. */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M14.6 14.6L19.2 19.2" />
    </svg>
  );
}

/* Scouting — an owl, front on: tufted head and two eyes, nothing else. */
function ScoutingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.4 13.2V8.8l1.2-3 2.6 2.6h5.6l2.6-2.6 1.2 3v4.4a6.6 6.6 0 0 1-13.2 0Z" />
      <circle cx="9.1" cy="12.1" r="2.9" />
      <circle cx="14.9" cy="12.1" r="2.9" />
      <circle cx="9.1" cy="12.1" r="1" style="fill:currentColor" />
      <circle cx="14.9" cy="12.1" r="1" style="fill:currentColor" />
    </svg>
  );
}

/* Narratives — two set columns; reads at 16px where the dog-eared page did not. */
function NarrativesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="13" />
      <path d="M12 5.5V18.5" />
      <path d="M6.4 9.2H10" />
      <path d="M6.4 12H10" />
      <path d="M6.4 14.8H8.8" />
      <path d="M14 9.2H17.6" />
      <path d="M14 12H17.6" />
    </svg>
  );
}

/* Vibe — a flame: the one glyph in the set with a temperature. */
function VibeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.4c2.7 3.3 5.5 5.3 5.5 8.9a5.5 5.5 0 0 1-11 0c0-2.1.9-3.8 2.4-5.2.1 1.9.9 2.9 2 3.4-.5-2.7.1-5.2 1.1-7.1Z" />
      <path d="M12 12.4c1.3 1.7 2.1 2.5 2.1 3.8a2.1 2.1 0 0 1-4.2 0c0-1.3.8-2.1 2.1-3.8Z" />
    </svg>
  );
}

/* Momentum — the trend line keeps the box to itself. */
function MomentumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 16.8L9.4 11.9L13.1 14.4L19.5 7.2" />
      <path d="M15.4 7.2H19.5V11.1" />
    </svg>
  );
}

/* Sigil — seal, not hex-cage: triangle inscribed in a circle, nothing else. */
function SigilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 5.2L18 15.6H6Z" />
    </svg>
  );
}

/* Transfers — two passes crossing the box. */
function TransfersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.6 9.4H17" />
      <path d="M14.4 6.8L17 9.4L14.4 12" />
      <path d="M19.4 14.9H7" />
      <path d="M9.6 12.3L7 14.9L9.6 17.5" />
    </svg>
  );
}

/* Appearance — half-tone disc. It says light/dark; the gear said preferences. */
function AppearanceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 5.5A6.5 6.5 0 0 0 12 18.5Z" style="fill:currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 4.25v2M12 17.75v2M4.25 12h2M17.75 12h2M6.52 6.52l1.42 1.42M16.06 16.06l1.42 1.42M17.48 6.52l-1.42 1.42M7.94 16.06l-1.42 1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.9 13.2A7.2 7.2 0 1 1 10.8 5.1a5.6 5.6 0 0 0 8.1 8.1z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="5.5" width="15" height="10.5" />
      <path d="M9.5 19h5M12 16.5V19" />
    </svg>
  );
}

const THEME_ICONS: Record<ThemePref, () => JSX.Element> = {
  light: SunIcon,
  dark: MoonIcon,
  system: SystemIcon,
};

/* Recent-entity mark — the entity's headshot/crest in the glyph box, with a
   monogram fallback when there's no image (legacy record) or the third-party
   URL 403/404s. */
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
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  // AppTray renders inside the Router root, so the router's reactive location
  // is available — it is the only owner of location state (SSR included).
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  let searchButtonRef!: HTMLButtonElement;
  let searchPopoverRef!: HTMLDivElement;
  let settingsButtonRef!: HTMLButtonElement;
  let settingsMenuRef!: HTMLDivElement;

  // Board labels speak the characters' lenses (matching the profile card
  // names, Scott 2026-07-23); ids and ?board= values are unchanged.
  const items = (): TrayItem[] => [
    { id: "rating", label: "Scouting", icon: <ScoutingIcon /> },
    { id: "news", label: "Narratives", icon: <NarrativesIcon /> },
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
    if (board === "narratives") return "news";
    return board === "news" || board === "vibes" || board === "sigil" || board === "transfers"
      ? board
      : "rating";
  };

  function closeSearch() {
    setSearchOpen(false);
  }

  function toggleSearch() {
    setSearchOpen((open) => !open);
    setSettingsOpen(false);
  }

  function toggleSettings() {
    setSettingsOpen((open) => !open);
    setSearchOpen(false);
  }

  function toggleExpanded() {
    setExpanded((open) => {
      const next = !open;
      writeExpanded(next);
      return next;
    });
    // The pop-outs anchor to row positions — fold them on a posture change.
    setSearchOpen(false);
    setSettingsOpen(false);
  }

  async function rememberCurrentProfile() {
    const parts = parseProfilePath(location.pathname);
    if (!parts) return;
    const { sport: rawSport, type: rawType, id } = parts;

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
    initTheme();
  });

  createEffect(() => {
    void rememberCurrentProfile();
  });

  // The page recenters around the open tray (Scott, 2026-07-23): reflect the
  // state on <html> so AppTray.css can pad #app — the content centers in the
  // remaining width instead of sitting under the panel. Effects never run
  // during SSR, so crawlers and first paint always see the collapsed layout.
  createEffect(() => {
    document.documentElement.toggleAttribute("data-tray-expanded", expanded());
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

  // Same dismissal contract as the search pop-out: outside press or Escape.
  createEffect(() => {
    if (!settingsOpen()) return;

    const onDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node;
      if (settingsButtonRef?.contains(target) || settingsMenuRef?.contains(target)) return;
      setSettingsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSettingsOpen(false);
        settingsButtonRef?.focus();
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

  /* The Marker — one selection language with the NavWell: a 6px circle of
     --text, 7px inside the row's right edge on the open tray. Collapsed,
     there is no room and no need (ink and weight carry it); the mobile bar
     seats it above the active glyph, where the well seats it above the tab. */
  const Marker = () => <span class="app-tray-marker" aria-hidden="true" />;

  return (
    <nav
      class="app-tray"
      classList={{ "app-tray-expanded": expanded() }}
      aria-label="Scoracle navigation"
    >
      {/* Header row. Collapsed: the rail glyph alone. Open: wordmark left,
          rail glyph right. Same row height in both postures. */}
      <div class="app-tray-top">
        <Show when={expanded()}>
          <a href="/" class="app-tray-wordmark" onClick={closeSearch}>Scoracle</a>
        </Show>
        <button
          type="button"
          class="app-tray-toggle"
          aria-label={expanded() ? "Collapse menu" : "Expand menu"}
          aria-expanded={expanded()}
          onClick={toggleExpanded}
        >
          <span class="app-tray-icon"><RailIcon /></span>
          <span class="app-tray-tip" aria-hidden="true">{expanded() ? "Collapse" : "Expand"}</span>
        </button>
      </div>

      <a
        href="/"
        class="app-tray-row app-tray-home"
        classList={{ "app-tray-current": isHome() }}
        aria-label="Home"
        aria-current={isHome() ? "page" : undefined}
        onClick={closeSearch}
      >
        <span class="app-tray-icon"><BrandMark class="app-tray-logo" /></span>
        <span class="app-tray-label" aria-hidden="true">Home</span>
        <span class="app-tray-tip" aria-hidden="true">Home</span>
        <Show when={isHome()}><Marker /></Show>
      </a>
      <Show when={!isHome()}>
        <button
          ref={searchButtonRef}
          type="button"
          class="app-tray-row app-tray-search-row"
          classList={{ "app-tray-open": searchOpen(), "app-tray-btn-suppress-tip": searchOpen() }}
          aria-label="Search"
          aria-expanded={searchOpen()}
          onClick={toggleSearch}
        >
          <span class="app-tray-icon"><SearchIcon /></span>
          <span class="app-tray-label" aria-hidden="true">Search</span>
          <span class="app-tray-tip" aria-hidden="true">Search</span>
        </button>
      </Show>

      <div class="app-tray-sep" aria-hidden="true" />
      <Show when={expanded()}>
        <span class="app-tray-section" aria-hidden="true">Boards</span>
      </Show>

      <div class="app-tray-primary" aria-label="Discovery boards">
        <For each={items()}>
          {(item) => (
            <a
              href={boardHref(sport() ?? "nba", item.id)}
              class="app-tray-row"
              classList={{ "app-tray-current": activeBoard() === item.id }}
              aria-label={item.label}
              aria-current={activeBoard() === item.id ? "page" : undefined}
              onClick={closeSearch}
            >
              <span class="app-tray-icon">{item.icon}</span>
              <span class="app-tray-label" aria-hidden="true">{item.label}</span>
              <span class="app-tray-tip" aria-hidden="true">{item.label}</span>
              <Show when={activeBoard() === item.id}><Marker /></Show>
            </a>
          )}
        </For>
      </div>

      {/* Recently viewed — restored by product call (Scott, 2026-08-08) after
          the spec cut it. Same row anatomy as everything else; the marks rest
          grayscale so the section stays chrome (AppTray.css). Desktop only —
          the mobile bar has no room. */}
      <Show when={recents().length > 0}>
        <div class="app-tray-recents" aria-label="Recently viewed">
          <div class="app-tray-sep" aria-hidden="true" />
          <Show when={expanded()}>
            <span class="app-tray-section" aria-hidden="true">Recent</span>
          </Show>
          <For each={recents()}>
            {(entity) => (
              <a
                href={profileHref(entity)}
                class="app-tray-row app-tray-recent"
                aria-label={`Open ${entity.name}`}
                onClick={closeSearch}
              >
                <span class="app-tray-icon"><RecentMark entity={entity} /></span>
                <span class="app-tray-label" aria-hidden="true">{entity.name}</span>
                <span class="app-tray-tip" aria-hidden="true">{entity.name}</span>
              </a>
            )}
          </For>
        </div>
      </Show>

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

      {/* Foot: the legal line (open only) above the Appearance row. */}
      <div class="app-tray-foot">
        <Show when={expanded()}>
          <div class="app-tray-legal" aria-label="Legal">
            <For each={LEGAL_LINKS}>
              {(link) => (
                <a href={link.href} class="app-tray-legal-link" onClick={closeSearch}>
                  {link.label}
                </a>
              )}
            </For>
          </div>
        </Show>
        <div class="app-tray-settings">
          <Show when={settingsOpen()}>
            <div ref={settingsMenuRef} class="app-tray-settings-menu" role="group" aria-label="Appearance">
              <span class="app-tray-settings-title" aria-hidden="true">Appearance</span>
              <For each={THEME_OPTIONS}>
                {(option) => {
                  const Icon = THEME_ICONS[option.id];
                  return (
                    <button
                      type="button"
                      class="app-tray-row app-tray-theme-option"
                      classList={{ "app-tray-open": themePref() === option.id }}
                      aria-pressed={themePref() === option.id}
                      onClick={() => setTheme(option.id)}
                    >
                      <span class="app-tray-icon"><Icon /></span>
                      <span class="app-tray-theme-label">{option.label}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
          <button
            ref={settingsButtonRef}
            type="button"
            class="app-tray-row"
            classList={{
              "app-tray-open": settingsOpen(),
              "app-tray-btn-suppress-tip": settingsOpen(),
            }}
            aria-label="Appearance settings"
            aria-expanded={settingsOpen()}
            onClick={toggleSettings}
          >
            <span class="app-tray-icon"><AppearanceIcon /></span>
            <span class="app-tray-label" aria-hidden="true">Appearance</span>
            <span class="app-tray-tip" aria-hidden="true">Appearance</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
