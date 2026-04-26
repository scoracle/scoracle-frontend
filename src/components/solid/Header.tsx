/**
 * Header — Sticky header with hamburger menu, search, and home button (Solid.js island)
 *
 * Hamburger uses native <details>/<summary> for zero-JS open/close toggle.
 * Minimal JS added for click-outside-to-close, Escape-to-close, and
 * language select persistence.
 */

import { createSignal, onMount, onCleanup } from 'solid-js';
import { isServer } from 'solid-js/web';
import SearchBar from './SearchBar';
import './Header.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  showSearch?: boolean;
}

type Theme = 'light' | 'dark';

// ─── Constants ──────────────────────────────────────────────────────────────

const LANG_STORAGE_KEY = 'preferred-language';
const THEME_STORAGE_KEY = 'scoracle-theme';

// ─── Component ──────────────────────────────────────────────────────────────

export default function Header(props: HeaderProps) {
  let detailsRef!: HTMLDetailsElement;
  let langSelectRef!: HTMLSelectElement;

  const [theme, setTheme] = createSignal<Theme>('light');

  function onDocumentClick(e: MouseEvent) {
    if (detailsRef?.open && !detailsRef.contains(e.target as Node)) {
      detailsRef.open = false;
    }
  }

  function onDocumentKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && detailsRef?.open) {
      detailsRef.open = false;
    }
  }

  function applyTheme(next: Theme) {
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch { /* storage unavailable */ }
  }

  onMount(() => {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);

    // Sync theme signal with whatever class is currently on <html>.
    // TODO: a pre-paint script (inline <script> in entry-server.tsx) is not
    // yet ported from the Astro Layout — without it, dark-mode users see a
    // brief flash of the light theme on first paint. Tracked for follow-up.
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    // Language select persistence
    if (langSelectRef) {
      try {
        const saved = localStorage.getItem(LANG_STORAGE_KEY);
        if (saved) langSelectRef.value = saved;
      } catch { /* storage unavailable */ }
    }
  });

  onCleanup(() => {
    // Solid runs onCleanup on the SSR server too at end-of-render.
    // Guard browser-API access so the server doesn't ReferenceError.
    if (isServer) return;
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeydown);
  });

  return (
    <header class="header-wrapper">
      <div class="header-content">
        {/* Left: Hamburger Menu */}
        <div class="header-left">
          <details ref={detailsRef} id="hamburger-menu" class="hamburger-menu-wrapper">
            <summary class="header-btn hamburger-btn" aria-label="Toggle menu">
              <svg class="icon-large menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg class="icon-large close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </summary>

            <div class="menu-dropdown">
              <div class="menu-content">
                <nav class="menu-nav">
                  <a href="/" class="menu-link" onClick={() => { window.location.href = '/'; }}>
                    <svg class="menu-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </a>
                  <a href="/terms" class="menu-link">
                    <svg class="menu-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Terms
                  </a>
                  <a href="/privacy" class="menu-link">
                    <svg class="menu-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Privacy
                  </a>
                </nav>

                <hr class="menu-divider" />

                <div class="menu-section">
                  <p class="menu-section-title">Language</p>
                  <div class="select-wrapper">
                    <select
                      ref={langSelectRef}
                      id="language-select"
                      class="menu-select"
                      onChange={(e) => {
                        try {
                          localStorage.setItem(LANG_STORAGE_KEY, e.currentTarget.value);
                        } catch { /* storage unavailable */ }
                      }}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>

                <div class="menu-section">
                  <p class="menu-section-title">Theme</p>
                  <div class="theme-toggle">
                    <button
                      type="button"
                      class="theme-toggle-btn"
                      classList={{ active: theme() === 'light' }}
                      onClick={() => applyTheme('light')}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      class="theme-toggle-btn"
                      classList={{ active: theme() === 'dark' }}
                      onClick={() => applyTheme('dark')}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Center: Search Bar */}
        {props.showSearch !== false && (
          <div class="header-center">
            <SearchBar />
          </div>
        )}

        {/* Right: Home Button */}
        <div class="header-right">
          <a href="/" class="home-btn" aria-label="Go to home" onClick={() => { window.location.href = '/'; }}>
            <svg class="icon-home" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
