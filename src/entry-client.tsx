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

function isCrossOriginFrame() {
  if (typeof window === "undefined") return false;
  if (window.self === window.top) return false;

  try {
    return window.top?.location.origin !== window.location.origin;
  } catch {
    return true;
  }
}

// Google AdSense previews/reviews render the site inside a cross-origin iframe.
// If hydration throws there, SolidStart replaces SSR content with its client
// fallback. Leave the server-rendered page intact for preview/crawler surfaces;
// real top-level users still get the fully hydrated app.
if (!isCrossOriginFrame()) {
  mount(() => <StartClient />, document.getElementById("app")!);
}
