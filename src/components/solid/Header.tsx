/**
 * Header — Sticky header with hamburger menu, search, and home button (Solid.js island)
 *
 * Hamburger uses native <details>/<summary> for zero-JS open/close toggle.
 * Minimal JS added for click-outside-to-close and Escape-to-close.
 *
 * Language and theme controls are intentionally out for initial roll-out
 * (2026-05-14) — neither feature is built out yet. The dormant
 * `scoracle-theme` pre-paint script in entry-server.tsx and the dormant
 * `.dark` CSS rules are left in place so re-enabling is mechanical
 * (re-add the hamburger sections + the data binding here).
 */

import { onMount, onCleanup } from 'solid-js';
import { isServer } from 'solid-js/web';
import SearchBar from './SearchBar';
import './Header.css';

interface HeaderProps {
  showSearch?: boolean;
}

export default function Header(props: HeaderProps) {
  let detailsRef!: HTMLDetailsElement;

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

  onMount(() => {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);
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
                  <a href="/" class="menu-link">
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
          <a href="/" class="home-btn" aria-label="Go to home">
            <svg class="icon-home" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
