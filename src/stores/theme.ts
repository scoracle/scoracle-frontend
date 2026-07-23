/**
 * Theme store — shared reactive state for the appearance preference.
 *
 * Same posture as sport.ts: a module-level Solid signal, SSR-safe via a
 * constant default ("system") at module eval. The real preference loads in
 * initTheme(), which only ever runs in client lifecycles (onMount), so the
 * module signal never mutates during SSR and hydration stays deterministic.
 *
 * The class flip itself happens in three places that must agree on the
 * "scoracle-theme" localStorage key and the resolution rule
 * (dark ⇔ pref === "dark", or pref absent/"system" with a dark OS):
 *   1. the pre-paint inline script in entry-server.tsx (no-FOUC),
 *   2. initTheme() on mount (picks up the stored pref + arms the OS listener),
 *   3. setTheme() when the user chooses in the gear menu / footer control.
 */

import { createSignal } from "solid-js";

export type ThemePref = "light" | "dark" | "system";

export const THEME_OPTIONS: ReadonlyArray<{ id: ThemePref; label: string }> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const STORAGE_KEY = "scoracle-theme";

const [themePref, setThemePrefSignal] = createSignal<ThemePref>("system");

export { themePref };

let initialized = false;
let media: MediaQueryList | undefined;

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && media?.matches === true);
  document.documentElement.classList.toggle("dark", dark);
}

/** Idempotent client-side init. Every mounted caller (AppTray, Footer) invokes
 *  it; the first one wins and arms the OS-preference listener. */
export function initTheme() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  media = window.matchMedia("(prefers-color-scheme: dark)");
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") setThemePrefSignal(stored);
  } catch {
    /* storage unavailable */
  }
  // Live-track the OS while in system mode. Module-singleton listener — never
  // detached; it lives exactly as long as the page.
  media.addEventListener("change", () => {
    if (themePref() === "system") apply("system");
  });
  apply(themePref());
}

/** Change the appearance preference. Persists for the pre-paint script. */
export function setTheme(pref: ThemePref) {
  setThemePrefSignal(pref);
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* storage unavailable */
  }
  apply(pref);
}
