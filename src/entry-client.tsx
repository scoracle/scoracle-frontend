import { mount, StartClient } from "@solidjs/start/client";
import { reloadForStaleChunk } from "./lib/utils/chunk-reload";

// A modulepreload for a hashed route chunk can 404 after a deploy replaced it. Vite
// fires `vite:preloadError` before the import() rejects — reload once to fetch the
// fresh index (guarded against loops). The error boundary handles the import() case too.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault(); // we recover via reload rather than letting it throw
  reloadForStaleChunk();
});

mount(() => <StartClient />, document.getElementById("app")!);
