import Icon, { BrandMark } from "./Icon";
export { BrandMark } from "./Icon";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { currentSport } from "../../stores/sport";
import { THEME_OPTIONS, initTheme, setTheme, themePref, type ThemePref } from "../../stores/theme";
import { getEntityMeta } from "../../lib/data/entity-meta.server";
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
const LEGAL_LINKS: ReadonlyArray<{
    href: string;
    label: string;
}> = [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/about", label: "About" },
];
/** The orb is the home/search entry; Leaderboard is the rail's page row.
 *  Board switching lives on the leaderboard page's NavWell; the tray
 *  carries the active sport. */
function leaderboardHref(sport: string): string {
    return `/leaderboard?${new URLSearchParams({ sport: sport.toUpperCase() }).toString()}`;
}
function profileHref(entity: RecentEntity): string {
    return profilePath(entity.sport, entity.type, entity.id, { name: entity.name });
}
function readRecents(): RecentEntity[] {
    if (typeof window === "undefined")
        return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]") as RecentEntity[];
        return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
    }
    catch {
        return [];
    }
}
function writeRecents(items: RecentEntity[]) {
    if (typeof window === "undefined")
        return;
    try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
    }
    catch {
        // Storage can be unavailable in restricted iframe/privacy contexts.
    }
}
function readExpanded(): boolean {
    if (typeof window === "undefined")
        return false;
    try {
        return window.localStorage.getItem(EXPANDED_KEY) === "1";
    }
    catch {
        return false;
    }
}
function writeExpanded(value: boolean) {
    if (typeof window === "undefined")
        return;
    try {
        window.localStorage.setItem(EXPANDED_KEY, value ? "1" : "0");
    }
    catch {
        // Storage can be unavailable in restricted iframe/privacy contexts.
    }
}
/**
 * The settings menu's dismissal contract: an outside pointer/mouse press
 * closes, Escape closes and returns focus to the trigger. Listeners register
 * only while open; `triggerRef()` / `panelRef()` return the live refs.
 */
function dismissalHandlers(close: () => void, triggerRef: () => HTMLElement | undefined, panelRef: () => HTMLElement | undefined): {
    onDown: (e: PointerEvent | MouseEvent) => void;
    onKeyDown: (e: KeyboardEvent) => void;
} {
    const onDown = (event: PointerEvent | MouseEvent) => {
        const target = event.target as Node;
        if (triggerRef()?.contains(target) || panelRef()?.contains(target))
            return;
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
// Phosphor Light and the approved monochrome mark come from scoracle-tokens.
const MenuIcon = () => <Icon name="menu"/>;
const RailIcon = () => <Icon name="collapse"/>;
const LeaderboardIcon = () => <Icon name="leaderboard"/>;
const GearIcon = () => <Icon name="settings"/>;
const SunIcon = () => <Icon name="sun"/>;
const MoonIcon = () => <Icon name="moon"/>;
const SystemIcon = () => <Icon name="system"/>;
const THEME_ICONS: Record<ThemePref, () => JSX.Element> = {
    light: SunIcon,
    dark: MoonIcon,
    system: SystemIcon,
};
/* Recent-entity mark — the entity's headshot/crest in the glyph box, with a
   monogram fallback when there's no image (legacy record) or the third-party
   URL 403/404s. */
function RecentMark(props: {
    entity: RecentEntity;
}) {
    const [failed, setFailed] = createSignal(false);
    return (<Show when={props.entity.image && !failed()} fallback={<span class="app-tray-recent-mark" aria-hidden="true">
          {props.entity.name.slice(0, 1)}
        </span>}>
      <img class="app-tray-recent-mark app-tray-recent-img" src={props.entity.image} alt="" aria-hidden="true" loading="lazy" onError={() => setFailed(true)}/>
    </Show>);
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
    const isLeaderboard = () => location.pathname === "/leaderboard" || location.pathname.startsWith("/story/");
    const isCurrentEntity = (entity: RecentEntity) => {
        const current = parseProfilePath(location.pathname);
        return current?.sport === entity.sport.toLowerCase()
            && current.type === entity.type && current.id === entity.id;
    };
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
    async function currentProfile(pathname: string): Promise<RecentEntity | null> {
        const parts = parseProfilePath(pathname);
        if (!parts)
            return null;
        const { sport: rawSport, type: rawType, id } = parts;
        const match = await getEntityMeta(rawSport, rawType, id).catch(() => null);
        const next: RecentEntity = {
            sport: rawSport,
            type: rawType,
            id,
            name: match?.name ?? `${rawType} ${id}`,
            image: match?.photoUrl || match?.teamLogoUrl || undefined,
        };
        return next;
    }
    onSettled(() => {
        setRecents(readRecents());
        setExpanded(readExpanded());
        initTheme();
    });
    const profile = createMemo(() => currentProfile(location.pathname));
    createEffect(profile, next => {
        if (!next)
            return;
        setRecents((current) => {
            const deduped = current.filter((item) => !(item.sport === next.sport && item.type === next.type && item.id === next.id));
            const updated = [next, ...deduped].slice(0, MAX_RECENTS);
            writeRecents(updated);
            return updated;
        });
    }, { ssrSource: "client" });
    createEffect(settingsOpen, open => {
        if (!open)
            return;
        const { onDown, onKeyDown } = dismissalHandlers(() => setSettingsOpen(false), () => settingsButtonRef, () => settingsMenuRef);
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    });
    /* The Marker — one selection language with the NavWell: a 6px circle of
       --text, 7px inside the row's right edge on the open tray. Collapsed,
       there is no room and no need (ink and weight carry it); the mobile bar
       seats it above the active glyph, where the well seats it above the tab. */
    const Marker = () => <span class="app-tray-marker" aria-hidden="true"/>;
    return (<nav aria-label="Scoracle navigation" class={["app-tray", { "app-tray-expanded": expanded() }]}>
      {/* Header row: the brand mark, anchored top-left in both postures —
                it IS the home link. Open, the collapse glyph sits at the far
                right of the same row (where Google's rail seats it). */}
      <div class="app-tray-top">
        <a href="/" class="app-tray-brand" aria-label="Home" aria-current={isHome() ? "page" : undefined} onClick={closeSettings}>
          <BrandMark class="app-tray-logo"/>
          <span class="app-tray-tip" aria-hidden="true">Home</span>
        </a>
        <Show when={expanded()}>
          <button type="button" class="app-tray-toggle" aria-label="Collapse menu" aria-expanded="true" onClick={toggleExpanded}>
            <span class="app-tray-icon"><RailIcon /></span>
          </button>
        </Show>
      </div>

      {/* Collapsed: the expand glyph is the first row under the brand. */}
      <Show when={!expanded()}>
        <button type="button" class="app-tray-row app-tray-toggle-row" aria-label="Expand menu" aria-expanded="false" onClick={toggleExpanded}>
          <span class="app-tray-icon"><MenuIcon /></span>
          <span class="app-tray-tip" aria-hidden="true">Expand</span>
        </button>
      </Show>

      <div class="app-tray-primary" aria-label="Pages">
        <a href={leaderboardHref(sport() ?? "nba")} aria-label="Leaderboard" aria-current={isLeaderboard() ? "page" : undefined} onClick={closeSettings} class={["app-tray-row", { "app-tray-current": isLeaderboard() }]}>
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
            {(entity) => (<a href={profileHref(entity)} aria-label={`Open ${entity.name}`} aria-current={isCurrentEntity(entity) ? "page" : undefined} onClick={closeSettings} class={["app-tray-row app-tray-recent", { "app-tray-current": isCurrentEntity(entity) }]}>
                <span class="app-tray-icon"><RecentMark entity={entity}/></span>
                <span class="app-tray-label" aria-hidden="true">{entity.name}</span>
                <Show when={isCurrentEntity(entity)}><Marker /></Show>
              </a>)}
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
            return (<button type="button" aria-pressed={themePref() === option.id ? "true" : "false"} onClick={() => setTheme(option.id)} class={["app-tray-row app-tray-theme-option", { "app-tray-open": themePref() === option.id }]}>
                      <span class="app-tray-icon"><Icon /></span>
                      <span class="app-tray-theme-label">{option.label}</span>
                    </button>);
        }}
              </For>
              <div class="app-tray-legal" aria-label="Legal">
                <For each={LEGAL_LINKS}>
                  {(link) => (<a href={link.href} class="app-tray-legal-link" onClick={closeSettings}>
                      {link.label}
                    </a>)}
                </For>
              </div>
            </div>
          </Show>
          <button ref={settingsButtonRef} type="button" aria-label="Settings" aria-expanded={settingsOpen() ? "true" : "false"} onClick={toggleSettings} class={["app-tray-row", {
                "app-tray-open": settingsOpen(),
                "app-tray-btn-suppress-tip": settingsOpen(),
            }]}>
            <span class="app-tray-icon"><GearIcon /></span>
            <span class="app-tray-label" aria-hidden="true">Settings</span>
            <span class="app-tray-tip" aria-hidden="true">Settings</span>
          </button>
        </div>
      </div>
    </nav>);
}
