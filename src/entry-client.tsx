import { mount, StartClient } from "@solidjs/start/client";
import { reloadForStaleChunk } from "./lib/utils/chunk-reload";

// A modulepreload for a hashed route chunk can 404 after a deploy replaced it. Vite
// fires `vite:preloadError` before the import() rejects — reload once to fetch the
// fresh index (guarded against loops). The error boundary handles the import() case too.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault(); // we recover via reload rather than letting it throw
    reloadForStaleChunk();
  });
}

function isInFrame() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isCrossOriginFrame() {
  if (typeof window === "undefined") return false;
  if (!isInFrame()) return false;

  try {
    return window.top?.location.origin !== window.location.origin;
  } catch {
    return true;
  }
}

function hostnameFromUrl(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isGoogleOwnedFrameOrigin(origin: string): boolean {
  const host = hostnameFromUrl(origin);
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

function hasGooglePreviewAncestor() {
  if (typeof window === "undefined") return false;
  const locationWithAncestors = window.location as Location & {
    ancestorOrigins?: DOMStringList;
  };
  const ancestors = locationWithAncestors.ancestorOrigins;
  if (!ancestors) return false;

  for (let i = 0; i < ancestors.length; i += 1) {
    if (isGoogleOwnedFrameOrigin(ancestors.item(i) ?? "")) return true;
  }
  return false;
}

function isAdSensePreviewReferrer() {
  if (typeof document === "undefined" || !document.referrer) return false;

  try {
    const referrer = new URL(document.referrer);
    const host = referrer.hostname.toLowerCase();
    if (host === "adsense.google.com") return true;
    if (
      host.endsWith(".googlesyndication.com") ||
      host.endsWith(".googleadservices.com") ||
      host.endsWith(".doubleclick.net") ||
      host.endsWith(".adtrafficquality.google")
    ) {
      return true;
    }

    const googleHost = host === "google.com" || host.endsWith(".google.com");
    return googleHost && /(^|\/)(adsense|adpreview|pagead)(\/|$)/i.test(referrer.pathname);
  } catch {
    return false;
  }
}

function isGoogleCrawlerUserAgent() {
  if (typeof navigator === "undefined") return false;
  return /AdsBot-Google|Mediapartners-Google|Googlebot|Google-InspectionTool|GoogleOther/i.test(
    navigator.userAgent,
  );
}

function shouldSkipHydrationForReviewPreview() {
  return (
    isCrossOriginFrame() ||
    hasGooglePreviewAncestor() ||
    isAdSensePreviewReferrer() ||
    isGoogleCrawlerUserAgent()
  );
}

// Google AdSense previews/reviews render the site inside a cross-origin iframe.
// If hydration throws there, SolidStart replaces SSR content with its client
// fallback. Leave the server-rendered page intact for preview/crawler surfaces;
// real top-level users still get the fully hydrated app. AdSense can also run
// the preview in a Google-owned browser context where `window.top` does not
// look cross-origin to the page, so referrer/ancestor-origin checks are part of
// the same crawler-safe contract.
if (shouldSkipHydrationForReviewPreview()) {
  document.documentElement.dataset.scoracleHydration = "skipped-review-preview";
} else {
  mount(() => <StartClient />, document.getElementById("app")!);
}
