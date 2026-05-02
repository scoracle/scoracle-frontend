/**
 * Footer — global site disclaimer, used on every route.
 *
 * Single-paragraph trademark/logo notice; this is required for any site
 * that displays third-party logos or team marks for identification. The
 * text is intentionally identical to the Astro flagship's footer so the
 * legal posture is unchanged across the cutover.
 */

import "./Footer.css";

export default function Footer() {
  return (
    <footer class="site-disclaimer">
      <p>
        All logos and trademarks are the property of their respective owners
        and are used here for identification and informational purposes only.
        Their use does not imply any affiliation with or endorsement by the
        rights holders.
      </p>
    </footer>
  );
}
