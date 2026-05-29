/**
 * Share dispatch — the single client entry point for "share this card."
 *
 * Strategy: hand the canonical URL + post copy to `navigator.share({
 * title, text, url })`. The OS share sheet routes to whichever target
 * the user picks (X, iMessage, IG, Mail, AirDrop…) and that platform's
 * crawler renders the OG card from the shared URL's `og:image` meta —
 * the same server-rendered `/og/...` tarot PNG, fetched once by the
 * crawler.
 *
 * No image is attached client-side. The crawler is the single source of
 * the share image, so the post shows exactly one card, not two (an
 * attached file PLUS the crawled OG card was the redundant-image bug
 * this replaces).
 *
 * Coverage:
 *   - iOS Safari, Android Chrome      → OS sheet; target crawler renders OG
 *   - Safari macOS 14+                → macOS share sheet
 *   - Chrome / Edge desktop           → OS sheet on Win/Mac/Linux
 *   - Firefox / older browsers        → returns `{ kind: "fallback" }`
 *                                       so caller can render the fallback
 *                                       modal (open X / FB composer +
 *                                       copy link — each renders the OG
 *                                       card from the link)
 */

export interface ShareCardInput {
  /** Pre-filled post copy. Apps that respect `text` use this. */
  text: string;
  /** Canonical URL. The share target's crawler reads its `og:image`. */
  url: string;
  /** Display name for OS share-sheet metadata. Optional. */
  title?: string;
}

export type ShareCardResult =
  | { kind: "shared" }
  | { kind: "fallback" }
  | { kind: "error"; message: string };

export async function shareCard(input: ShareCardInput): Promise<ShareCardResult> {
  const payload: ShareData = {
    title: input.title,
    text: input.text,
    url: input.url,
  };

  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return { kind: "fallback" };
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
    return { kind: "fallback" };
  }
}
