import { createMiddleware } from "@solidjs/start/middleware";

// 'unsafe-eval' is required by SolidStart 2.0 alpha hydration — the seroval
// serializer it ships with uses `new Function()` to deserialize inline
// resource data on the client. Without it, hydration fails on first paint and
// the user gets the ErrorBoundary fallback until they click "Try again."
// Same-origin script policy still applies; no third-party JS is loaded that
// takes user input, so the practical XSS surface is unchanged.
//
// Google AdSense entries: AdSense's loader + dynamic chunks come from a
// handful of *.googlesyndication.com / *.doubleclick.net / *.google.com
// subdomains, and ad creatives render inside iframes served from the same
// origins. Wildcarding these subdomains is the standard AdSense CSP
// posture documented by Google; narrower lists break when Google rotates
// serving infrastructure.
const adsenseScriptSrc = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.googleadservices.com",
  "https://*.google.com",
  "https://*.doubleclick.net",
  "https://tpc.googlesyndication.com",
  // SODAR (Spam Or Damaging Activity Reporting) — AdSense's bot/fraud
  // detection module, served from a separate ad-traffic-quality domain.
  // Without it, AdSense surfaces an "Uncaught (in promise) undefined"
  // from show_ads_impl and may suppress ad-serving.
  "https://*.adtrafficquality.google",
].join(" ");

const adsenseFrameSrc = [
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.adtrafficquality.google",
].join(" ");

// AdSense's site preview/review renders the publisher site inside Google-owned
// frames. CSP checks every ancestor in a nested frame chain, so allow the
// AdSense console plus Google's ad preview infrastructure while still blocking
// arbitrary third-party framing.
const frameAncestors = [
  "'self'",
  "https://adsense.google.com",
  "https://google.com",
  "https://*.google.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
].join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com ${adsenseScriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "img-src 'self' data: https: http: blob:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
  "connect-src 'self' https: http: ws: wss:",
  `frame-src 'self' ${adsenseFrameSrc}`,
  `frame-ancestors ${frameAncestors}`,
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const staticAssetPattern =
  /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|otf|eot|json)$/i;

export default createMiddleware({
  onBeforeResponse: [
    (event) => {
      const url = new URL(event.request.url);
      if (staticAssetPattern.test(url.pathname)) return;

      const headers = event.response.headers;
      headers.set("Content-Security-Policy", csp);
      // X-Frame-Options cannot express "self plus adsense.google.com"; CSP
      // frame-ancestors above is the modern, narrower framing policy.
      headers.delete("X-Frame-Options");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set(
        "Permissions-Policy",
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
      );

      if (
        url.pathname === "/" ||
        url.pathname === "/profile" ||
        url.pathname === "/leaderboard" ||
        url.pathname === "/about" ||
        url.pathname === "/contact" ||
        url.pathname === "/terms" ||
        url.pathname === "/privacy"
      ) {
        headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      }
    },
  ],
});
