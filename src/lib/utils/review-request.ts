import { isGoogleCrawlerUserAgent, isReviewReferrer } from "./review-signals";

export {
  isGoogleCrawlerUserAgent,
  isGoogleOwnedPreviewHost,
  isReviewReferrer,
} from "./review-signals";

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
