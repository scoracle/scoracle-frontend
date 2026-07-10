const googleCrawlerUserAgentPattern =
  /AdsBot-Google|Mediapartners-Google|Googlebot|Google-InspectionTool|GoogleOther/i;

export function isGoogleCrawlerUserAgent(userAgent: string | null): boolean {
  return googleCrawlerUserAgentPattern.test(userAgent ?? "");
}

export function isGoogleOwnedPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
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

export function isReviewReferrer(referrer: string | null): boolean {
  if (!referrer) return false;

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (!isGoogleOwnedPreviewHost(host)) return false;

    if (host === "adsense.google.com") return true;
    if (
      host.endsWith(".googlesyndication.com") ||
      host.endsWith(".googleadservices.com") ||
      host.endsWith(".doubleclick.net") ||
      host.endsWith(".adtrafficquality.google")
    ) {
      return true;
    }

    return /(^|\/)(adsense|adpreview|pagead)(\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isLikelyCrossSiteFrame(headers: Headers): boolean {
  const destination = headers.get("sec-fetch-dest")?.toLowerCase() ?? "";
  const site = headers.get("sec-fetch-site")?.toLowerCase() ?? "";

  return destination === "iframe" && site === "cross-site";
}

export function isCrawlerReviewRequest(request: Request | null | undefined): boolean {
  if (!request) return false;

  const headers = request.headers;
  return (
    isGoogleCrawlerUserAgent(headers.get("user-agent")) ||
    isReviewReferrer(headers.get("referer")) ||
    isLikelyCrossSiteFrame(headers)
  );
}
