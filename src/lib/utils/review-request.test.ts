import { describe, expect, it } from "vitest";
import {
  isCrawlerReviewRequest,
  isGoogleCrawlerUserAgent,
  isGoogleOwnedPreviewHost,
  isReviewReferrer,
} from "./review-request";

function requestWithHeaders(headers: HeadersInit) {
  return { headers: new Headers(headers) } as Request;
}

describe("isReviewReferrer", () => {
  it("matches AdSense console referrers", () => {
    expect(isReviewReferrer("https://adsense.google.com/adsense/u/0/pub-9821466912189944/sites")).toBe(
      true,
    );
  });

  it("matches Google ad preview paths without matching every Google referrer", () => {
    expect(isReviewReferrer("https://www.google.com/adpreview/diagnostic")).toBe(true);
    expect(isReviewReferrer("https://www.google.com/search?q=scoracle")).toBe(false);
  });
});

describe("shared Google review signals", () => {
  it("matches Google-owned preview and ad serving hosts", () => {
    expect(isGoogleOwnedPreviewHost("adsense.google.com")).toBe(true);
    expect(isGoogleOwnedPreviewHost("pagead2.googlesyndication.com")).toBe(true);
    expect(isGoogleOwnedPreviewHost("tpc.doubleclick.net")).toBe(true);
    expect(isGoogleOwnedPreviewHost("cdn.example.com")).toBe(false);
  });

  it("matches crawler user agents without matching normal browsers", () => {
    expect(isGoogleCrawlerUserAgent("Mozilla/5.0 AppleWebKit GoogleOther")).toBe(true);
    expect(
      isGoogleCrawlerUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("isCrawlerReviewRequest", () => {
  it("matches Google crawler and review user agents", () => {
    expect(
      isCrawlerReviewRequest(
        requestWithHeaders({
          "user-agent": "Mozilla/5.0 (compatible; AdsBot-Google; +http://www.google.com/adsbot.html)",
        }),
      ),
    ).toBe(true);
  });

  it("matches cross-site iframe document requests", () => {
    expect(
      isCrawlerReviewRequest(
        requestWithHeaders({
          "sec-fetch-dest": "iframe",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(true);
  });

  it("does not match normal top-level browser requests", () => {
    expect(
      isCrawlerReviewRequest(
        requestWithHeaders({
          "sec-fetch-dest": "document",
          "sec-fetch-site": "none",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        }),
      ),
    ).toBe(false);
  });
});
