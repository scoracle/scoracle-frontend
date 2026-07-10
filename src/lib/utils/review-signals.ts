export const GOOGLE_CRAWLER_USER_AGENT_PATTERN =
  /AdsBot-Google|Mediapartners-Google|Googlebot|Google-InspectionTool|GoogleOther/i;

export const GOOGLE_REVIEW_PATH_PATTERN = /(^|\/)(adsense|adpreview|pagead)(\/|$)/i;

export function isGoogleCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  return GOOGLE_CRAWLER_USER_AGENT_PATTERN.test(userAgent ?? "");
}

export function isGoogleOwnedPreviewHost(hostname: string | null | undefined): boolean {
  const host = (hostname ?? "").toLowerCase();
  return (
    host === "adsense.google.com" ||
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host.endsWith(".googlesyndication.com") ||
    host.endsWith(".googleadservices.com") ||
    host.endsWith(".doubleclick.net") ||
    host.endsWith(".adtrafficquality.google")
  );
}

export function isGoogleAdServingHost(hostname: string | null | undefined): boolean {
  const host = (hostname ?? "").toLowerCase();
  return (
    host === "adsense.google.com" ||
    host.endsWith(".googlesyndication.com") ||
    host.endsWith(".googleadservices.com") ||
    host.endsWith(".doubleclick.net") ||
    host.endsWith(".adtrafficquality.google")
  );
}

export function isReviewReferrer(referrer: string | null | undefined): boolean {
  if (!referrer) return false;

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (!isGoogleOwnedPreviewHost(host)) return false;
    return isGoogleAdServingHost(host) || GOOGLE_REVIEW_PATH_PATTERN.test(url.pathname);
  } catch {
    return false;
  }
}
