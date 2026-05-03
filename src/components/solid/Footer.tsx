/**
 * Footer — global site footer used on every route. Two parts:
 *  1. Legal nav links (Terms / Privacy)
 *  2. Trademark/logo disclaimer required for any site that displays
 *     third-party team marks for identification.
 */

import "./Footer.css";

export default function Footer() {
  return (
    <footer class="site-footer">
      <nav class="site-footer-links" aria-label="Legal">
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
