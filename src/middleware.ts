import { profilePath } from "./lib/utils/profile-url";
// Existing production CSP retained through the migration. The old serializer
// required unsafe-eval; tighten separately after auditing the new runtime.
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

// AdSense's console preview renders the publisher site inside Google-owned
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

function isCacheableDocumentPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/leaderboard" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/terms" ||
    pathname === "/privacy"
  );
}

/** Legacy profile deep links (`/profile?sport=…&type=…&id=…`) permanently
 *  redirect to the path-based shape (`/profile/nba/player/123`) so old links,
 *  bookmarks, and anything Google already crawled consolidate onto one URL
 *  per entity. Secondary params (tab, season, …) ride along untouched. */
function legacyProfileRedirect(url: URL): Response | undefined {
  if (url.pathname !== "/profile") return undefined;
  const sport = url.searchParams.get("sport");
  const id = url.searchParams.get("id");
  if (!sport || !id) return undefined;

  const type = url.searchParams.get("type") === "team" ? "team" : "player";
  const rest = new URLSearchParams(url.searchParams);
  rest.delete("sport");
  rest.delete("type");
  rest.delete("id");
  const qs = rest.toString();
  const location = `${profilePath(sport, type, id)}${qs ? `?${qs}` : ""}`;
  return new Response(null, { status: 301, headers: { Location: location } });
}

export default async function responsePolicy(request: Request, next: () => Promise<Response>) {
  const url = new URL(request.url);
  const redirect = legacyProfileRedirect(url);
  if (redirect) return redirect;
  const response = await next();
  const output = new Response(response.body, response);
  const headers = output.headers;
  headers.set("Content-Security-Policy", csp);
  headers.delete("X-Frame-Options");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
  if (isCacheableDocumentPath(url.pathname)) {
    headers.set("Cache-Control", response.status >= 400 || headers.get("Cache-Control") === "no-store"
      ? "no-store" : "public, max-age=300, stale-while-revalidate=600");
  } else if (url.pathname.startsWith("/_server")) headers.set("Cache-Control", "no-store");
  return output;
}
