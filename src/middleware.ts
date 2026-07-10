import { createMiddleware } from "@solidjs/start/middleware";
import { isCrawlerReviewRequest } from "./lib/utils/review-request";

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

const reviewCsp = [
  "default-src 'self'",
  "script-src 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "img-src 'self' data: https: http: blob:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
  "connect-src 'self'",
  `frame-src 'self' ${adsenseFrameSrc}`,
  `frame-ancestors ${frameAncestors}`,
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const staticAssetPattern =
  /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|otf|eot|json)$/i;

const executableReviewAssetPattern =
  /<script\b[\s\S]*?<\/script>|<link\b(?=[^>]*\brel\s*=\s*(?:"modulepreload"|'modulepreload'|modulepreload)(?=\s|\/|>))[^>]*\/?>/gi;

function appendVary(headers: Headers, values: string[]) {
  const current = headers
    .get("Vary")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  const seen = new Set(current.map((value) => value.toLowerCase()));

  for (const value of values) {
    if (seen.has(value.toLowerCase())) continue;
    current.push(value);
    seen.add(value.toLowerCase());
  }

  if (current.length > 0) headers.set("Vary", current.join(", "));
}

function isCacheableDocumentPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/profile" ||
    pathname === "/leaderboard" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/terms" ||
    pathname === "/privacy"
  );
}

function applyDocumentHeaders(headers: Headers, pathname: string, isReviewRequest: boolean) {
  headers.set("Content-Security-Policy", isReviewRequest ? reviewCsp : csp);
  // X-Frame-Options cannot express "self plus adsense.google.com"; CSP
  // frame-ancestors above is the modern, narrower framing policy.
  headers.delete("X-Frame-Options");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );

  if (isReviewRequest) {
    headers.set("Cache-Control", "no-store");
    headers.set("X-Scoracle-Render-Mode", "review-ssr");
    headers.delete("Content-Length");
    headers.delete("ETag");
    appendVary(headers, ["User-Agent", "Referer", "Sec-Fetch-Dest", "Sec-Fetch-Site"]);
  } else if (isCacheableDocumentPath(pathname)) {
    headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  }
}

function isHtmlResponse(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("text/html") ?? false;
}

function isHtmlBody(body: string): boolean {
  return body.includes("<html") || body.includes("<!DOCTYPE html");
}

export function stripExecutableReviewAssets(html: string): string {
  return html.replace(executableReviewAssetPattern, "");
}

export default createMiddleware({
  onBeforeResponse: [
    (event, response): Response | Promise<Response> | void => {
      const url = new URL(event.request.url);
      if (staticAssetPattern.test(url.pathname)) return;

      const isReviewRequest = isCrawlerReviewRequest(event.request);
      const originalResponse = response.body instanceof Response ? response.body : undefined;

      if (isReviewRequest && typeof response.body === "string" && isHtmlBody(response.body)) {
        const headers = new Headers(event.response.headers);
        applyDocumentHeaders(headers, url.pathname, isReviewRequest);
        if (!headers.has("Content-Type")) headers.set("Content-Type", "text/html; charset=utf-8");
        return new Response(stripExecutableReviewAssets(response.body), {
          status: event.response.status ?? 200,
          statusText: event.response.statusText,
          headers,
        });
      }

      if (isReviewRequest && originalResponse && isHtmlResponse(originalResponse)) {
        const headers = new Headers(originalResponse.headers);
        applyDocumentHeaders(headers, url.pathname, isReviewRequest);
        return originalResponse.text().then((html) => {
          return new Response(stripExecutableReviewAssets(html), {
            status: originalResponse.status,
            statusText: originalResponse.statusText,
            headers,
          });
        });
      }

      applyDocumentHeaders(event.response.headers, url.pathname, isReviewRequest);
    },
  ],
});
