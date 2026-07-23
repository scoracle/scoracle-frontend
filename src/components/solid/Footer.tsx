/**
 * Footer — global site footer used on every route. Three parts:
 *  1. Appearance control (mobile only — the tray bar has no foot for the
 *     gear the desktop rail carries, and a ninth bar slot overflows 390px)
 *  2. Site + legal nav links (About / Contact / Terms / Privacy)
 *  3. Trademark/logo disclaimer required for any site that displays
 *     third-party team marks for identification.
 */

import { For, onMount } from "solid-js";

import { THEME_OPTIONS, initTheme, setTheme, themePref } from "../../stores/theme";
import "./Footer.css";

export default function Footer() {
  onMount(initTheme);

  return (
    <footer class="site-footer">
      <div class="site-footer-theme" role="group" aria-label="Appearance">
        <For each={THEME_OPTIONS}>
          {(option) => (
            <button
              type="button"
              classList={{ "is-current": themePref() === option.id }}
              aria-pressed={themePref() === option.id}
              onClick={() => setTheme(option.id)}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>
      <nav class="site-footer-links" aria-label="Footer">
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </nav>
      <p class="site-disclaimer">
        All logos and trademarks are the property of their respective owners
        and are used here for identification and informational purposes only.
        Their use does not imply any affiliation with or endorsement by the
        rights holders.
      </p>
    </footer>
  );
}
