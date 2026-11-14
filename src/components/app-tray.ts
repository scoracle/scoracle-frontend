import { subscribeBoardSport } from "../lib/board-sport";
import { imageUrl } from "../lib/utils/image-url";
import { profilePath, parseProfilePath } from "../lib/utils/profile-url";
import { registerDismissal } from "../lib/utils/dismissal";

export interface RecentEntity {
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
function readRecents(): RecentEntity[] {
    if (typeof window === "undefined")
        return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]") as RecentEntity[];
        return Array.isArray(parsed) ? parsed.filter(item => item && ["nba", "nfl", "football"].includes(item.sport)
            && ["player", "team"].includes(item.type) && typeof item.id === "string" && /^[1-9]\d*$/.test(item.id)
            && typeof item.name === "string" && item.name.trim()
            && (item.image === undefined || typeof item.image === "string")).slice(0, MAX_RECENTS) : [];
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

export function mountAppTray(root: HTMLElement): () => void {
    const nav = root.querySelector<HTMLElement>('nav')!;
    const expand = root.querySelector<HTMLButtonElement>('.app-tray-toggle-row')!;
    const collapse = root.querySelector<HTMLButtonElement>('.app-tray-toggle')!;
    const settings = root.querySelector<HTMLButtonElement>('button[aria-label="Settings"]')!;
    const template = root.querySelector<HTMLTemplateElement>('template')!;
    const recents = root.querySelector<HTMLElement>('.app-tray-recents')!;
    const current = parseProfilePath(root.dataset.pathname!);
    const next: RecentEntity | undefined = root.dataset.entity ? JSON.parse(root.dataset.entity) : undefined;
    const stored = readRecents();
    const list = next ? [next, ...stored.filter(item => !(item.sport === next.sport && item.type === next.type && item.id === next.id))].slice(0, MAX_RECENTS) : stored;
    if (next) writeRecents(list);
    recents.querySelectorAll('a').forEach(link => link.remove());
    for (const entity of list) {
        const link = document.createElement('a');
        link.className = 'app-tray-row app-tray-recent';
        link.href = profilePath(entity.sport, entity.type, entity.id, { name: entity.name });
        link.setAttribute('aria-label', `Open ${entity.name}`);
        const icon = document.createElement('span');
        icon.className = 'app-tray-icon';
        const fallback = document.createElement('span');
        fallback.className = 'app-tray-recent-mark';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = entity.name.slice(0, 1);
        if (entity.image) {
            const image = document.createElement('img');
            image.className = 'app-tray-recent-mark app-tray-recent-img';
            image.alt = '';
            image.setAttribute('aria-hidden', 'true');
            image.loading = 'lazy';
            image.onerror = () => image.parentNode?.replaceChild(fallback, image);
            image.src = imageUrl(entity.image, 96);
            icon.appendChild(image);
        } else icon.appendChild(fallback);
        const label = document.createElement('span');
        label.className = 'app-tray-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = entity.name;
        link.appendChild(icon);
        link.appendChild(label);
        if (current?.sport === entity.sport && current.type === entity.type && current.id === entity.id) {
            link.classList.add('app-tray-current');
            link.setAttribute('aria-current', 'page');
            const marker = document.createElement('span');
            marker.className = 'app-tray-marker';
            marker.setAttribute('aria-hidden', 'true');
            link.appendChild(marker);
        }
        recents.appendChild(link);
    }
    let expanded = readExpanded();
    function renderExpanded() {
        nav.classList.toggle('app-tray-expanded', expanded);
        expand.hidden = expanded;
        collapse.hidden = !expanded;
        recents.hidden = !expanded || !list.length;
    }
    renderExpanded();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    let theme = 'system';
    try {
        const stored = localStorage.getItem('scoracle-theme');
        if (stored === 'light' || stored === 'dark') theme = stored;
    } catch { /* Storage unavailable. */ }
    function applyTheme() {
        document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
        root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button => {
            const active = button.dataset.theme === theme;
            button.setAttribute('aria-pressed', String(active));
            button.classList.toggle('app-tray-open', active);
        });
    }
    applyTheme();
    media.addEventListener('change', applyTheme);
    let menu: HTMLElement | undefined;
    let dismiss: (() => void) | undefined;
    function closeSettings() {
        dismiss?.();
        dismiss = undefined;
        menu?.remove();
        menu = undefined;
        settings.setAttribute('aria-expanded', 'false');
        settings.classList.remove('app-tray-open', 'app-tray-btn-suppress-tip');
    }
    function onClick(event: MouseEvent) {
        const target = (event.target as Element).closest('button, a');
        if (target === expand || target === collapse) {
            expanded = !expanded;
            writeExpanded(expanded);
            renderExpanded();
            closeSettings();
        } else if (target === settings) {
            if (menu) return closeSettings();
            menu = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
            settings.parentNode!.insertBefore(menu, settings);
            settings.setAttribute('aria-expanded', 'true');
            settings.classList.add('app-tray-open', 'app-tray-btn-suppress-tip');
            applyTheme();
            dismiss = registerDismissal({
                contains: node => settings.contains(node) || !!menu?.contains(node),
                close: closeSettings, focusTrigger: () => settings.focus(),
            });
        } else if (target instanceof HTMLButtonElement && ['light', 'dark', 'system'].includes(target.dataset.theme ?? '')) {
            theme = target.dataset.theme!;
            try { localStorage.setItem('scoracle-theme', theme); } catch { /* Storage unavailable. */ }
            applyTheme();
        } else if (target instanceof HTMLAnchorElement) closeSettings();
    }
    root.addEventListener('click', onClick);
    const unsubscribe = root.dataset.pathname === '/leaderboard' ? subscribeBoardSport(sport => {
        root.querySelector<HTMLAnchorElement>('[aria-label="Leaderboard"]')!.href = `/leaderboard?${new URLSearchParams({ sport: sport.toUpperCase() })}`;
    }) : undefined;
    return () => {
        closeSettings();
        unsubscribe?.();
        media.removeEventListener('change', applyTheme);
        root.removeEventListener('click', onClick);
    };
}
