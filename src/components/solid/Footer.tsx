/**
 * Footer — global site footer used on every route: the trademark/logo
 * disclaimer required for any site that displays third-party team marks
 * for identification, and nothing else. The site + legal links (About /
 * Contact / Terms / Privacy) live in the AppTray now (Scott, 2026-08-04).
 */

import "./Footer.css";

export default function Footer() {
  return (
    <footer class="site-footer">
      <p class="site-disclaimer">
        All logos and trademarks are the property of their respective owners
        and are used here for identification and informational purposes only.
        Their use does not imply any affiliation with or endorsement by the
        rights holders.
      </p>
    </footer>
  );
}
