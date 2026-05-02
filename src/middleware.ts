import { createMiddleware } from "@solidjs/start/middleware";

// 'unsafe-eval' is required by SolidStart 2.0 streaming-SSR hydration —
// the seroval serializer it ships with uses `new Function()` to deserialize
// inline resource data on the client. Without it, hydration fails on first
// paint and the user gets the ErrorBoundary fallback until they click "Try
// again." Same-origin script policy still applies; no third-party JS is
// loaded that takes user input, so the practical XSS surface is unchanged.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "img-src 'self' data: https: http: blob:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
  "connect-src 'self' https: http: ws: wss:",
  "frame-ancestors 'none'",
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
      headers.set("X-Frame-Options", "DENY");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set(
        "Permissions-Policy",
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
      );

      if (
        url.pathname === "/" ||
        url.pathname === "/profile" ||
        url.pathname === "/terms"
      ) {
        headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      }
    },
  ],
});
