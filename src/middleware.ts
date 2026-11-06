import { profilePath } from "./lib/utils/profile-url";
// Existing production CSP retained through the migration. The old serializer
// required unsafe-eval; tighten separately after auditing the new runtime.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "img-src 'self' data: https: http: blob:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
  "connect-src 'self' https: http: ws: wss:",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

function isCacheableDocumentPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/profile/") ||
    pathname === "/leaderboard" ||
    pathname === "/about"
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
