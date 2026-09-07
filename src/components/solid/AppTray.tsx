import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { useLocation } from "@solidjs/router";

import { currentSport } from "../../stores/sport";
import { THEME_OPTIONS, initTheme, setTheme, themePref, type ThemePref } from "../../stores/theme";
import { getSportMetaMaps, type SportMetaMaps } from "../../lib/data/entity-directory";
import { profilePath, parseProfilePath } from "../../lib/utils/profile-url";
import "./AppTray.css";

/** Recently-viewed entity — restored 2026-08-08 (Scott: product wins over the
 *  spec's cut). Open tray only since the rail went minimal (2026-09-07): the
 *  collapsed rail is brand, expand, Leaderboard, Settings — nothing else. */
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
// these as discrete routes (they already share legal.css); they ride the
// Settings pop-out as one quiet line under the Appearance options.
const LEGAL_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/about", label: "About" },
];

/** The rail's page links (Scott, 2026-09-07 — the Google AI-mode rail):
 *  Search, which is the home page (the hero search autofocuses there — the
 *  rail has no pop-out of its own any more), and Leaderboard. Board
 *  switching lives on the leaderboard page's own NavWell again; the tray
 *  carries the active sport and nothing else. */
function leaderboardHref(sport: string): string {
  return `/leaderboard?${new URLSearchParams({ sport: sport.toUpperCase() }).toString()}`;
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

/**
 * The settings menu's dismissal contract: an outside pointer/mouse press
 * closes, Escape closes and returns focus to the trigger. Listeners register
 * only while open; `triggerRef()` / `panelRef()` return the live refs.
 */
function dismissalHandlers(
  close: () => void,
  triggerRef: () => HTMLElement | undefined,
  panelRef: () => HTMLElement | undefined,
): { onDown: (e: PointerEvent | MouseEvent) => void; onKeyDown: (e: KeyboardEvent) => void } {
  const onDown = (event: PointerEvent | MouseEvent) => {
    const target = event.target as Node;
    if (triggerRef()?.contains(target) || panelRef()?.contains(target)) return;
    close();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      triggerRef()?.focus();
    }
  };
  return { onDown, onKeyDown };
}

/* ─── The glyph set (Tray/Well/Board session, 2026-08-08; the rail went
   minimal 2026-09-07) ─────────────────────────────────────────────────────
   One construction: a 24 box with a 4px margin, 1.1px stroke, butt caps and
   mitre joins (AppTray.css owns the stroke). Each glyph is one continuous
   idea, drawn with as few strokes as it can survive. The brand mark is the
   one exception — round joins, see BrandMark below. The seven board glyphs
   retired with the board rows; the leaderboard page's NavWell is type. */

/* Brand mark — the home-page hero crystal ball minus the hands, reduced to icon
   linework: the ball, two glass-highlight slivers, and the scalloped petal cup
   it sits in. Keeps round joins as a deliberate exception: it is a reduction of
   the hero illustration, not a UI glyph, and the favicon and card backs descend
   from it — that geometry belongs to the crystal-ball session. Geometry is
   shared with `public/favicon-4.svg` (scaled 4/3 there). The ball is filled
   with the orb blue and its slivers print white on it — the hero's glass, at
   icon size (Scott, 2026-09-07). Exported as the drawn source for the card
   backs (ReadingTable). */
export function BrandMark(props: { class?: string }) {
  // non-scaling-stroke: the mark draws LARGER than the glyphs (Scott,
  // 2026-09-07) but its lines stay the glyphs' exact 1.1px — the same pen,
  // a bigger drawing. Stroke width is set in AppTray.css in screen pixels.
  return (
    <svg class={props.class ?? "app-tray-logo"} viewBox="0 0 24 24" aria-hidden="true">
      <circle class="brand-mark-glass" cx="12" cy="10.5" r="6.7" vector-effect="non-scaling-stroke" />
      <path class="brand-mark-sliver" d="M14.5 6.17 A5 5 0 0 1 16.64 8.63" vector-effect="non-scaling-stroke" />
      <path class="brand-mark-sliver" d="M7.24 12.05 A5 5 0 0 0 9.65 14.91" vector-effect="non-scaling-stroke" />
      <path d="M8.3 16.1 C7.4 17 6.8 18 6.8 18.9 a1.6 1.35 0 0 0 3.2 0 a2 1.5 0 0 0 4 0 a1.6 1.35 0 0 0 3.2 0 C17.2 18 16.6 17 15.7 16.1" vector-effect="non-scaling-stroke" />
    </svg>
  );
}

/* Expand — two rules, the menu's oldest shorthand. Collapsed rail only. */
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9.5H19" />
      <path d="M5 14.5H19" />
    </svg>
  );
}

/* Collapse — square frame, partition at ⅓: the rail itself. Open tray only. */
function RailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="13" />
      <path d="M9.5 5.5V18.5" />
    </svg>
  );
}

/* Search — the oracle's glass: a lens with the ball's own four-point
   sparkle held inside it (the same diamond the hero art wears), the handle
   leaving on the true diagonal. It says "a new vision", not "find in
   page". */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="6" />
      <path d="M14.3 14.3L19.4 19.4" />
      <path d="M10 6.6 L10.9 9.1 L13.4 10 L10.9 10.9 L10 13.4 L9.1 10.9 L6.6 10 L9.1 9.1 Z" />
    </svg>
  );
}

/* Leaderboard — a podium: three steps on one baseline, the middle highest. */
function LeaderboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 18.5V11.5H9.5" />
      <path d="M9.5 18.5V5.5H14.5V18.5" />
      <path d="M14.5 13.5H19.5V18.5" />
      <path d="M4 18.5H20" />
    </svg>
  );
}

/* Settings — a gear: six teeth around a hub, one closed outline. Six, not
   eight — at 16px the denser wheel read heavier than the rest of the set. */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.08 6.1L10.51 3.73L13.49 3.73L13.92 6.1L16.15 7.39L18.42 6.58L19.9 9.15L18.06 10.71L18.06 13.29L19.9 14.85L18.42 17.42L16.15 16.61L13.92 17.9L13.49 20.27L10.51 20.27L10.08 17.9L7.85 16.61L5.58 17.42L4.1 14.85L5.94 13.29L5.94 10.71L4.1 9.15L5.58 6.58L7.85 7.39Z" />
      <circle cx="12" cy="12" r="2.8" />
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
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  // AppTray renders inside the Router root, so the router's reactive location
  // is available — it is the only owner of location state (SSR included).
  const location = useLocation();
  let settingsButtonRef!: HTMLButtonElement;
  let settingsMenuRef!: HTMLDivElement;

  const isHome = () => location.pathname === "/";
  // The leaderboard page owns every board — Stories included (2026-09-07) —
  // and the story detail pages are its children.
  const isLeaderboard = () =>
    location.pathname === "/leaderboard" || location.pathname.startsWith("/story/");

  function closeSettings() {
    setSettingsOpen(false);
  }

  function toggleSettings() {
    setSettingsOpen((open) => !open);
  }

  function toggleExpanded() {
    setExpanded((open) => {
      const next = !open;
      writeExpanded(next);
      return next;
    });
    // The pop-out anchors to a row position — fold it on a posture change.
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
    if (!settingsOpen()) return;
    const { onDown, onKeyDown } = dismissalHandlers(
      () => setSettingsOpen(false),
      () => settingsButtonRef,
      () => settingsMenuRef,
    );
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
      {/* Header row: the brand mark, anchored top-left in both postures —
          it IS the home link. Open, the collapse glyph sits at the far
          right of the same row (where Google's rail seats it). */}
      <div class="app-tray-top">
        <a
          href="/"
          class="app-tray-brand"
          aria-label="Home"
          aria-current={isHome() ? "page" : undefined}
          onClick={closeSettings}
        >
          <BrandMark class="app-tray-logo" />
          <span class="app-tray-tip" aria-hidden="true">Home</span>
        </a>
        <Show when={expanded()}>
          <button
            type="button"
            class="app-tray-toggle"
            aria-label="Collapse menu"
            aria-expanded="true"
            onClick={toggleExpanded}
          >
            <span class="app-tray-icon"><RailIcon /></span>
          </button>
        </Show>
      </div>

      {/* Collapsed: the expand glyph is the first row under the brand. */}
      <Show when={!expanded()}>
        <button
          type="button"
          class="app-tray-row app-tray-toggle-row"
          aria-label="Expand menu"
          aria-expanded="false"
          onClick={toggleExpanded}
        >
          <span class="app-tray-icon"><MenuIcon /></span>
          <span class="app-tray-tip" aria-hidden="true">Expand</span>
        </button>
      </Show>

      <div class="app-tray-primary" aria-label="Pages">
        {/* Search routes home — the search IS the home page. Never lit: the
            brand mark carries "current" there. */}
        <a
          href="/"
          class="app-tray-row"
          aria-label="New search"
          onClick={closeSettings}
        >
          <span class="app-tray-icon"><SearchIcon /></span>
          <span class="app-tray-label" aria-hidden="true">New search</span>
          <span class="app-tray-tip" aria-hidden="true">New search</span>
        </a>
        <a
          href={leaderboardHref(sport() ?? "nba")}
          class="app-tray-row"
          classList={{ "app-tray-current": isLeaderboard() }}
          aria-label="Leaderboard"
          aria-current={isLeaderboard() ? "page" : undefined}
          onClick={closeSettings}
        >
          <span class="app-tray-icon"><LeaderboardIcon /></span>
          <span class="app-tray-label" aria-hidden="true">Leaderboard</span>
          <span class="app-tray-tip" aria-hidden="true">Leaderboard</span>
          <Show when={isLeaderboard()}><Marker /></Show>
        </a>
      </div>

      {/* Recently viewed — restored by product call (Scott, 2026-08-08) after
          the spec cut it. Open tray only: the collapsed rail stays four
          glyphs. Same row anatomy as everything else; the marks print in
          the entity's own colour (the entity is the colour of the product). */}
      <Show when={expanded() && recents().length > 0}>
        <div class="app-tray-recents" aria-label="Recently viewed">
          <span class="app-tray-section" aria-hidden="true">Recent</span>
          <For each={recents()}>
            {(entity) => (
              <a
                href={profileHref(entity)}
                class="app-tray-row app-tray-recent"
                aria-label={`Open ${entity.name}`}
                onClick={closeSettings}
              >
                <span class="app-tray-icon"><RecentMark entity={entity} /></span>
                <span class="app-tray-label" aria-hidden="true">{entity.name}</span>
              </a>
            )}
          </For>
        </div>
      </Show>

      {/* Foot: the Settings row. Its pop-out holds Appearance and the legal
          line — the rail itself is one gear. */}
      <div class="app-tray-foot">
        <div class="app-tray-settings">
          <Show when={settingsOpen()}>
            <div ref={settingsMenuRef} class="app-tray-settings-menu" role="group" aria-label="Settings">
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
              <div class="app-tray-legal" aria-label="Legal">
                <For each={LEGAL_LINKS}>
                  {(link) => (
                    <a href={link.href} class="app-tray-legal-link" onClick={closeSettings}>
                      {link.label}
                    </a>
                  )}
                </For>
              </div>
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
            aria-label="Settings"
            aria-expanded={settingsOpen()}
            onClick={toggleSettings}
          >
            <span class="app-tray-icon"><GearIcon /></span>
            <span class="app-tray-label" aria-hidden="true">Settings</span>
            <span class="app-tray-tip" aria-hidden="true">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
