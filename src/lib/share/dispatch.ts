/**
 * Share dispatch — the single client entry point for "share this card."
 *
 * Strategy: fetch the server-rendered tarot PNG, then try
 * `navigator.share({ files, text, url })` for the OS share sheet with
 * the image already attached. The OS sheet routes to whichever target
 * the user picks (X, iMessage, IG, Mail, AirDrop…) and the image
 * arrives in the composer pre-attached — zero extra steps.
 *
 * Coverage:
 *   - iOS Safari, Android Chrome      → OS sheet, image attached
 *   - Safari macOS 14+                → macOS share sheet
 *   - Chrome / Edge desktop           → OS sheet on Win/Mac/Linux
 *   - Firefox / older browsers        → returns `{ kind: "fallback" }`
 *                                       so caller can render the
 *                                       fallback modal (download + open
 *                                       composer + copy link)
 *
 * Capability check uses `navigator.canShare({ files: [file] })` — the
 * only reliable test, since `navigator.share` is sometimes present
 * without file-attachment support.
 */

const PNG_FILENAME = "scoracle.png";

export interface ShareCardInput {
  /** PNG URL — the server-rendered `/og/...` route. */
  pngUrl: string;
  /** Pre-filled post copy. Apps that respect `text` use this. */
  text: string;
  /** Canonical URL. Apps that respect `url` use it for the link card. */
  url: string;
  /** Display name for OS share-sheet metadata. Optional. */
  title?: string;
}

export type ShareCardResult =
  | { kind: "shared" }
  | { kind: "fallback"; blob: Blob }
  | { kind: "error"; message: string };

export async function shareCard(input: ShareCardInput): Promise<ShareCardResult> {
  let blob: Blob;
  try {
    // `cache: "no-store"` bypasses the browser HTTP cache for the share
    // dispatch. The OG route still ships `Cache-Control: max-age=300`
    // for CDN / cross-user reuse, but per-tab the user-initiated share
    // click always pulls a freshly-rendered PNG — the underlying data
    // (stats, vibe, comparison) may have changed since the user first
    // landed on the page, and a stale cached PNG looks like a bug.
    const res = await fetch(input.pngUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`PNG fetch ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  const file = new File([blob], PNG_FILENAME, { type: "image/png" });
  const payload: ShareData = {
    title: input.title,
    text: input.text,
    url: input.url,
    files: [file],
  };

  if (!canShareFiles(payload)) {
    return { kind: "fallback", blob };
  }

  try {
    await navigator.share(payload);
    return { kind: "shared" };
  } catch (err) {
    // AbortError = user dismissed the OS sheet. Still "handled" —
    // user made the decision, no fallback needed.
    if (err instanceof DOMException && err.name === "AbortError") {
      return { kind: "shared" };
    }
    return { kind: "fallback", blob };
  }
}

function canShareFiles(payload: ShareData): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  return navigator.canShare(payload);
}
